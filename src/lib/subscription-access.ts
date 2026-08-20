/** Statuses that grant CRM access (aligned with src/lib/ai/quota.ts). */
export const SUBSCRIPTION_ACCESS_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export type SubscriptionAccessRow = {
  status: string;
  current_period_end?: string | null;
};

export function isSubscriptionAccessAllowed(
  subscription: SubscriptionAccessRow | null | undefined,
): boolean {
  if (!subscription) return false;
  if (!SUBSCRIPTION_ACCESS_STATUSES.has(subscription.status)) return false;
  if (
    subscription.current_period_end &&
    new Date(subscription.current_period_end) <= new Date()
  ) {
    return false;
  }
  return true;
}
