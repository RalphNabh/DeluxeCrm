import { requireOrgMember } from '@/lib/api-auth'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillableSeatCount } from "@/lib/stripe-seats";
import { countActiveSeats } from "@/lib/org";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase, { roles: ["owner", "admin"] });
    if (!auth.ok) return auth.response;

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("seat_quantity, status, stripe_subscription_id")
      .eq("organization_id", auth.ctx.orgId)
      .maybeSingle();

    const activeMembers = await countActiveSeats(supabase, auth.ctx.orgId);
    const billableSeats = await getBillableSeatCount(supabase, auth.ctx.orgId);

    return NextResponse.json({
      activeMembers,
      billableSeats,
      seatQuantity: subscription?.seat_quantity ?? billableSeats,
      subscriptionStatus: subscription?.status ?? "none",
    });
  } catch (error) {
    captureApiError(error, { route: "org/seats/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
