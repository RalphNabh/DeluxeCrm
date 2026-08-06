import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const { data: estimate, error } = await admin
      .from("estimates")
      .select(
        "id, estimate_number, status, subtotal, tax, total, notes, contract_message, valid_until, created_at, client_id, organization_id, estimate_line_items(id, description, quantity, unit, unit_price, total)",
      )
      .eq("id", id)
      .eq("client_id", auth.clientId)
      .eq("organization_id", auth.orgId)
      .neq("status", "Draft")
      .single();

    if (error || !estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    return NextResponse.json(estimate);
  } catch (error) {
    captureApiError(error, { route: "portal/estimates/[id]/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
