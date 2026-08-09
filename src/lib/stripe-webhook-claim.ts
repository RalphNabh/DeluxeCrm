import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed";

const STALE_PROCESSING_MS = 15 * 60 * 1000;

export type ClaimResult =
  | { action: "already_processed" }
  | { action: "claimed" }
  | { action: "in_progress" };

/**
 * Professional webhook idempotency: only `processed` is a durable ack.
 * Failed / stale processing events may be claimed again so Stripe retries work.
 */
export async function claimWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  eventType: string,
  now: Date = new Date(),
): Promise<ClaimResult> {
  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("event_id, status, updated_at, attempts")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.status === "processed") {
    return { action: "already_processed" };
  }

  if (existing?.status === "processing") {
    const updatedAt = existing.updated_at
      ? new Date(existing.updated_at).getTime()
      : 0;
    if (now.getTime() - updatedAt < STALE_PROCESSING_MS) {
      return { action: "in_progress" };
    }
  }

  const nextAttempts = (existing?.attempts ?? 0) + 1;

  if (!existing) {
    const { error } = await admin.from("stripe_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      status: "processing",
      attempts: 1,
      last_error: null,
      updated_at: now.toISOString(),
      processed_at: now.toISOString(),
    });
    if (error?.code === "23505") {
      // Concurrent insert — re-read.
      return claimWebhookEvent(admin, eventId, eventType, now);
    }
    if (error) throw error;
    return { action: "claimed" };
  }

  const { data: claimed, error } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempts: nextAttempts,
      last_error: null,
      updated_at: now.toISOString(),
      event_type: eventType,
    })
    .eq("event_id", eventId)
    .in("status", ["received", "failed", "processing"])
    .select("event_id")
    .maybeSingle();

  if (error) throw error;
  if (!claimed) {
    const { data: again } = await admin
      .from("stripe_webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (again?.status === "processed") return { action: "already_processed" };
    return { action: "in_progress" };
  }

  void row;
  return { action: "claimed" };
}

export async function markWebhookProcessed(
  admin: SupabaseClient,
  eventId: string,
  now: Date = new Date(),
): Promise<void> {
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      last_error: null,
      updated_at: now.toISOString(),
      processed_at: now.toISOString(),
    })
    .eq("event_id", eventId);

  if (error) throw error;
}

export async function markWebhookFailed(
  admin: SupabaseClient,
  eventId: string,
  lastError: string,
  now: Date = new Date(),
): Promise<void> {
  await admin
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      last_error: lastError.slice(0, 2000),
      updated_at: now.toISOString(),
    })
    .eq("event_id", eventId);
}
