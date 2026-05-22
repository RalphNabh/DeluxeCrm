import { createServiceRoleClient } from "@/lib/supabase/server";
import { currentYearMonthUtc, nextMonthResetIso } from "./scoring";

export { currentYearMonthUtc };

/**
 * Monthly AI Estimate quota lookup + enforcement.
 *
 * Plan caps (UTC calendar month, resets on the 1st):
 *   Starter      ->   5
 *   Pro          -> 100
 *   Enterprise   -> Infinity
 *
 * Plans are identified by the Stripe Price ID stored on `public.subscriptions`.
 * The Price IDs are configured via Vercel env vars:
 *
 *   NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER
 *   NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL
 *   NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE
 *
 * If a user has no active subscription, we treat them as a Starter (5/mo)
 * during free trials. The middleware already enforces that users without
 * an active subscription are bounced to /subscription, so this is only a
 * defensive fallback.
 */

export type PlanTier = "starter" | "professional" | "enterprise" | "unknown";

export const PLAN_CAPS: Record<PlanTier, number> = {
  starter: 5,
  professional: 100,
  enterprise: Number.POSITIVE_INFINITY,
  unknown: 5,
};

export interface QuotaStatus {
  tier: PlanTier;
  cap: number;
  used: number;
  remaining: number;
  /** ISO timestamp of the next quota reset (first of next UTC month). */
  resetsAt: string;
  yearMonth: string;
}

export function resolveTier(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "unknown";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER) return "starter";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL) return "professional";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE) return "enterprise";
  return "unknown";
}

/**
 * Returns the user's current month's quota status. Always returns a value —
 * if the usage row doesn't exist yet, `used` is 0 and `remaining` equals `cap`.
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const admin = createServiceRoleClient();

  const [{ data: sub }, { data: usage }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("stripe_price_id, status")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("ai_estimate_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("year_month", currentYearMonthUtc())
      .maybeSingle(),
  ]);

  // Only honor the plan tier when subscription is active/trialing. Otherwise
  // fall back to the most conservative cap. (Middleware bounces inactive
  // users to /subscription, so this branch is rarely hit.)
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const tier: PlanTier =
    sub && activeStatuses.has(sub.status as string)
      ? resolveTier(sub.stripe_price_id as string | null)
      : "unknown";

  const cap = PLAN_CAPS[tier];
  const used = usage?.count ?? 0;
  const remaining = Number.isFinite(cap) ? Math.max(0, cap - used) : Number.POSITIVE_INFINITY;

  return {
    tier,
    cap,
    used,
    remaining,
    resetsAt: nextMonthResetIso(),
    yearMonth: currentYearMonthUtc(),
  };
}

/**
 * Atomically check + increment the user's quota.
 * Returns { allowed: false, status } when the cap has been reached.
 *
 * Implementation note: we upsert with `count = count + 1` via a Postgres
 * function would be ideal, but to avoid a migration we do a read-then-write
 * here. The window for double-spend is small and the cron rate-limit
 * provides a backstop against burst abuse.
 */
export async function checkAndIncrementQuota(
  userId: string,
): Promise<{ allowed: boolean; status: QuotaStatus }> {
  const status = await getQuotaStatus(userId);
  if (status.remaining <= 0) {
    return { allowed: false, status };
  }

  const admin = createServiceRoleClient();
  const yearMonth = status.yearMonth;
  const newCount = status.used + 1;

  // Upsert: insert new row if missing, otherwise bump count.
  const { error } = await admin
    .from("ai_estimate_usage")
    .upsert(
      {
        user_id: userId,
        year_month: yearMonth,
        count: newCount,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year_month" },
    );

  if (error) {
    // Don't burn the user's quota if the DB write failed.
    throw new Error(`Failed to increment AI estimate usage: ${error.message}`);
  }

  return {
    allowed: true,
    status: {
      ...status,
      used: newCount,
      remaining: Number.isFinite(status.cap)
        ? Math.max(0, status.cap - newCount)
        : Number.POSITIVE_INFINITY,
    },
  };
}

/** Roll back a previously-incremented count (e.g. when the vision call fails). */
export async function decrementQuota(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const yearMonth = currentYearMonthUtc();

  const { data: row } = await admin
    .from("ai_estimate_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (!row || row.count <= 0) return;

  await admin
    .from("ai_estimate_usage")
    .update({ count: Math.max(0, row.count - 1) })
    .eq("user_id", userId)
    .eq("year_month", yearMonth);
}
