import type Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-11-17.clover" as const;

/** Stripe v20: period fields live on subscription items, not the subscription root. */
export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  current_period_start: number;
  current_period_end: number;
} {
  const item = subscription.items?.data?.[0];
  if (!item) {
    throw new Error("Subscription has no line items");
  }
  return {
    current_period_start: item.current_period_start,
    current_period_end: item.current_period_end,
  };
}

/** Stripe v20: subscription id on invoices is under parent.subscription_details. */
export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details?.subscription) return null;
  const sub = details.subscription;
  return typeof sub === "string" ? sub : sub.id;
}
