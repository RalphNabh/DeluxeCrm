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
