import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/automations/cron-auth";
import { processAutomationJob } from "@/lib/automations/executor";

/**
 * Process due automation_jobs.
 * Reclaims stale `processing` rows (>15m) so crashed workers cannot strand jobs.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 15 * 60 * 1000;

async function reclaimStaleProcessing(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await admin
    .from("automation_jobs")
    .update({
      status: "pending",
      last_error: "Reclaimed after stale processing timeout",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    Sentry.captureMessage(
      `[automation process] Failed to reclaim stale jobs: ${error.message}`,
      "warning",
    );
    return 0;
  }
  return data?.length ?? 0;
}

async function handle(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  try {
    const reclaimed = await reclaimStaleProcessing(admin);

    const { data: jobs, error } = await admin
      .from("automation_jobs")
      .select("id, automation_id, organization_id, payload, attempts, status")
      .eq("status", "pending")
      .lte("run_at", now)
      .order("run_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      throw new Error(`Failed to query automation_jobs: ${error.message}`);
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs ?? []) {
      const { data: claimed, error: claimError } = await admin
        .from("automation_jobs")
        .update({
          status: "processing",
          attempts: (job.attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (claimError || !claimed) {
        continue;
      }

      processed += 1;
      const attempts = (job.attempts ?? 0) + 1;

      try {
        const result = await processAutomationJob({
          id: job.id,
          automation_id: job.automation_id,
          organization_id: job.organization_id,
          payload: job.payload as {
            context?: {
              event: string;
              user_id: string;
              organization_id?: string;
              [key: string]: unknown;
            };
          } | null,
          attempts,
        });

        if (result.success) {
          await admin
            .from("automation_jobs")
            .update({
              status: "done",
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
          succeeded += 1;
        } else {
          const terminal = attempts >= MAX_ATTEMPTS;
          const update: Record<string, unknown> = {
            status: terminal ? "failed" : "pending",
            last_error: result.error || "Execution failed",
            updated_at: new Date().toISOString(),
          };
          if (!terminal) {
            update.run_at = new Date(
              Date.now() + attempts * 5 * 60 * 1000,
            ).toISOString();
          }
          await admin.from("automation_jobs").update(update).eq("id", job.id);
          failed += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        Sentry.captureException(err);
        const terminal = attempts >= MAX_ATTEMPTS;
        const update: Record<string, unknown> = {
          status: terminal ? "failed" : "pending",
          last_error: message,
          updated_at: new Date().toISOString(),
        };
        if (!terminal) {
          update.run_at = new Date(
            Date.now() + attempts * 5 * 60 * 1000,
          ).toISOString();
        }
        await admin.from("automation_jobs").update(update).eq("id", job.id);
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      reclaimed,
      scanned: jobs?.length ?? 0,
      processed,
      succeeded,
      failed,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Process cron failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
