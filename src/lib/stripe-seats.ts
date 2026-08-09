import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countActiveSeats } from "@/lib/org";

/** Total billable seats = 1 (owner) + active non-owner members */
export async function getBillableSeatCount(
  supabase: SupabaseClient,
  orgId: string,
): Promise<number> {
  const extraSeats = await countActiveSeats(supabase, orgId);
  return 1 + extraSeats;
}

export async function syncStripeSeatQuantity(
  stripe: Stripe,
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ success: boolean; quantity?: number; error?: string }> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_price_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!subscription?.stripe_subscription_id) {
    return { success: false, error: "No active Stripe subscription for org" };
  }

  const quantity = await getBillableSeatCount(supabase, orgId);

  try {
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
    );
    const item = stripeSub.items.data[0];
    if (!item) {
      return { success: false, error: "No subscription item found" };
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: "create_prorations",
    });

    await supabase
      .from("subscriptions")
      .update({ seat_quantity: quantity, updated_at: new Date().toISOString() })
      .eq("organization_id", orgId);

    return { success: true, quantity };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Stripe update failed",
    };
  }
}

/**
 * Bring Stripe in line with the current member count, tolerating an absent
 * Stripe configuration.
 *
 * Seat count changes whenever someone joins, is removed or is disabled. Callers
 * on those paths care about the membership change succeeding, not about billing,
 * so a Stripe failure is reported rather than thrown.
 */
export async function syncSeatQuantity(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ success: boolean; quantity?: number; error?: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: "Stripe is not configured" };
  }
  try {
    const { createStripeClient } = await import("@/lib/stripe-server");
    return await syncStripeSeatQuantity(createStripeClient(), supabase, orgId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Seat sync failed",
    };
  }
}

export async function canAddSeat(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, seat_quantity")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!subscription || subscription.status !== "active") {
    return {
      allowed: false,
      reason: "An active subscription is required before inviting team members.",
    };
  }

  const currentSeats = await getBillableSeatCount(supabase, orgId);
  const maxSeats = subscription.seat_quantity ?? currentSeats;

  if (currentSeats >= maxSeats + 5) {
    return { allowed: false, reason: "Seat limit reached. Upgrade your plan." };
  }

  return { allowed: true };
}
