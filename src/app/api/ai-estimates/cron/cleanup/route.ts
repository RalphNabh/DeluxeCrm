import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Nightly cron job: GET /api/ai-estimates/cron/cleanup
 *
 * Sweeps abandoned AI Estimate sessions and deletes their uploaded photos
 * from the `ai-estimates` storage bucket to keep storage costs bounded.
 *
 * "Abandoned" = a session row older than 90 days that never reached
 * status='converted'. The session row itself is kept (it's tiny) so usage
 * analytics remain queryable; only the photo objects are removed.
 *
 * Scheduled in vercel.json. Protected with CRON_SECRET when set.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 90;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel cron requests include this header automatically.
  const vercelHeader = request.headers.get("x-vercel-cron");
  if (vercelHeader) return true;
  if (!secret) {
    // No secret configured — only allow Vercel-stamped invocations.
    return false;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Find sessions older than the cutoff that never converted.
    const { data: sessions, error } = await admin
      .from("ai_estimate_sessions")
      .select("id, user_id, photo_urls, status")
      .lt("created_at", cutoff)
      .neq("status", "converted")
      .limit(500);

    if (error) {
      throw new Error(`Failed to query stale sessions: ${error.message}`);
    }

    let deletedPhotos = 0;
    let abandonedSessions = 0;

    for (const session of sessions ?? []) {
      const paths = (session.photo_urls as string[] | null) ?? [];
      if (paths.length > 0) {
        const { error: rmError } = await admin.storage
          .from("ai-estimates")
          .remove(paths);
        if (rmError) {
          // Don't abort — record it and continue with other sessions.
          Sentry.captureMessage(
            `[ai-estimates cleanup] Failed to remove photos for session ${session.id}: ${rmError.message}`,
            "warning",
          );
        } else {
          deletedPhotos += paths.length;
        }
      }

      // Mark as abandoned and clear the photo_urls so we don't try to
      // delete the same files again next night.
      await admin
        .from("ai_estimate_sessions")
        .update({ status: "abandoned", photo_urls: [] })
        .eq("id", session.id);
      abandonedSessions += 1;
    }

    return NextResponse.json({
      ok: true,
      retentionDays: RETENTION_DAYS,
      cutoff,
      scanned: sessions?.length ?? 0,
      deletedPhotos,
      abandonedSessions,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cleanup failed" },
      { status: 500 },
    );
  }
}
