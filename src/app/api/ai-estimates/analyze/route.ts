import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  checkAndIncrementQuota,
  decrementQuota,
  getQuotaStatus,
} from "@/lib/ai/quota";
import { analyzePhotosForMaterials } from "@/lib/ai/vision";
import { matchAndPriceItems } from "@/lib/ai/catalog-match";
import type { AiContext } from "@/lib/ai/types";

/**
 * POST /api/ai-estimates/analyze
 *
 * multipart/form-data:
 *   - photos[]: 1..5 image files, each ≤ 5MB
 *   - context: JSON string matching AiContext
 *
 * Pipeline:
 *   1. Auth          (Supabase user)
 *   2. Rate limit    (10/min/user)
 *   3. Quota         (plan-based monthly cap)
 *   4. Upload photos to `ai-estimates` storage bucket
 *   5. Vision        (GPT-4o, photos -> DetectedItem[])
 *   6. Catalog match (DetectedItem[] -> EnrichedLineItem[] using user materials)
 *   7. Persist       (ai_estimate_sessions row)
 *   8. Respond       ({ sessionId, detectedItems, photoPaths })
 *
 * On vision failure we roll back the quota increment so the user isn't
 * charged for a failed call.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60; // GPT-4o vision can take 20-30s for multi-photo sessions.

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const ContextSchema = z.object({
  trade: z
    .enum([
      "electrical",
      "plumbing",
      "hvac",
      "carpentry",
      "roofing",
      "painting",
      "flooring",
      "drywall",
      "general",
      "other",
    ])
    .optional(),
  sqft: z.number().nonnegative().optional(),
  labor_hours: z.number().nonnegative().optional(),
  labor_rate: z.number().nonnegative().optional(),
  markup_pct: z.number().min(0).max(500).optional(),
  notes: z.string().max(2000).optional(),
  region_zip: z.string().min(3).max(12).optional(),
  client_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
});

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...(extra ?? {}) } }, { status });
}

export async function POST(request: NextRequest) {
  let quotaIncremented = false;
  let userId: string | null = null;

  try {
    // ---- 1. Auth ----
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx
    userId = user.id;

    // ---- 2. Rate limit (per user) ----
    const rl = await rateLimit(request, "ai-estimate", user.id);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests. Try again in a moment.",
          },
        },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // ---- 3. Parse multipart ----
    const form = await request.formData();
    const rawContext = form.get("context");
    const photoEntries = form.getAll("photos").filter((v): v is File => v instanceof File);

    if (photoEntries.length === 0) {
      return jsonError(400, "no_photos", "Upload at least one photo.");
    }
    if (photoEntries.length > MAX_PHOTOS) {
      return jsonError(400, "too_many_photos", `Upload at most ${MAX_PHOTOS} photos.`);
    }

    for (const f of photoEntries) {
      if (!ALLOWED_MIME.includes(f.type)) {
        return jsonError(400, "bad_mime", `Unsupported image type: ${f.type || "unknown"}.`);
      }
      if (f.size > MAX_PHOTO_BYTES) {
        return jsonError(400, "photo_too_large", "Each photo must be 5MB or smaller.");
      }
    }

    let context: AiContext = {};
    if (rawContext) {
      try {
        const parsed = ContextSchema.parse(JSON.parse(String(rawContext)));
        context = parsed;
      } catch (err) {
        return jsonError(400, "bad_context", "Invalid context JSON.", {
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ---- 4. Quota check + increment (rolls back on failure below) ----
    const quotaCheck = await checkAndIncrementQuota(user.id);
    if (!quotaCheck.allowed) {
      return jsonError(
        429,
        "quota_exceeded",
        "You've used all your AI estimates this month. Upgrade your plan for more.",
        { quota: quotaCheck.status },
      );
    }
    quotaIncremented = true;

    // ---- 5. Create session row early so we can stamp errors on it ----
    const admin = createServiceRoleClient();
    const { data: session, error: sessionInsertError } = await admin
      .from("ai_estimate_sessions")
      .insert({
        user_id: user.id, organization_id: orgId,
        status: "analyzing",
        context,
      })
      .select("id")
      .single();

    if (sessionInsertError || !session) {
      throw new Error(
        `Failed to create ai_estimate_sessions row: ${sessionInsertError?.message ?? "unknown"}`,
      );
    }
    const sessionId = session.id as string;

    // ---- 6. Upload photos to private bucket ----
    const photoPaths: string[] = [];
    const dataUrls: string[] = [];
    for (let i = 0; i < photoEntries.length; i++) {
      const file = photoEntries[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const path = `${user.id}/${sessionId}/photo-${i}.${ext}`;
      const arrayBuf = await file.arrayBuffer();

      const { error: uploadError } = await admin.storage
        .from("ai-estimates")
        .upload(path, arrayBuf, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload photo ${i + 1}: ${uploadError.message}. ` +
            'If "Bucket not found", create a PRIVATE bucket named "ai-estimates" in Supabase Storage.',
        );
      }

      photoPaths.push(path);

      // Convert to base64 data URL so we can send the bytes directly to
      // OpenAI without exposing a public storage URL.
      const bytes = Buffer.from(arrayBuf);
      const b64 = bytes.toString("base64");
      dataUrls.push(`data:${file.type};base64,${b64}`);
    }

    await admin
      .from("ai_estimate_sessions")
      .update({ photo_urls: photoPaths })
      .eq("id", sessionId);

    // ---- 7. Vision + catalog match ----
    Sentry.addBreadcrumb({
      category: "ai-estimate",
      level: "info",
      message: "Calling vision provider",
      data: { sessionId, photoCount: photoEntries.length, trade: context.trade },
    });

    const vision = await analyzePhotosForMaterials(dataUrls, context);

    Sentry.addBreadcrumb({
      category: "ai-estimate",
      level: "info",
      message: "Vision returned items",
      data: {
        sessionId,
        itemCount: vision.detectedItems.length,
        model: vision.model,
        totalTokens: vision.usage?.totalTokens,
      },
    });

    const enriched = await matchAndPriceItems(user.id, vision.detectedItems, context);

    // ---- 8. Persist + respond ----
    await admin
      .from("ai_estimate_sessions")
      .update({
        status: "ready",
        detected_items: enriched,
      })
      .eq("id", sessionId);

    const quotaStatus = await getQuotaStatus(user.id);

    return NextResponse.json(
      {
        sessionId,
        detectedItems: enriched,
        photoPaths,
        model: vision.model,
        quota: quotaStatus,
      },
      { status: 200, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    // Roll back the quota so a failed AI call doesn't burn the user's allowance.
    if (quotaIncremented && userId) {
      try {
        await decrementQuota(userId);
      } catch (rollbackErr) {
        Sentry.captureException(rollbackErr);
      }
    }

    Sentry.captureException(err);

    const message = err instanceof Error ? err.message : "Unexpected error.";
    return jsonError(500, "analyze_failed", message);
  }
}

/**
 * GET /api/ai-estimates/analyze
 *
 * Lightweight helper — returns the caller's current quota status. The wizard
 * uses this on mount to render "you have N AI estimates left this month".
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "unauthorized", "You must be signed in.");
    }
    const status = await getQuotaStatus(user.id);
    return NextResponse.json({ quota: status });
  } catch (err) {
    Sentry.captureException(err);
    return jsonError(500, "quota_lookup_failed", "Failed to load quota.");
  }
}
