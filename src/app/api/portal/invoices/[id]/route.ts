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
    const { data: invoice, error } = await admin
      .from("invoices")
      .select(
        "id, invoice_number, status, subtotal, tax, total, due_date, paid_at, notes, created_at, client_id, organization_id, invoice_line_items(id, description, quantity, unit, unit_price, total), payments(id, amount, payment_method, payment_date, reference)",
      )
      .eq("id", id)
      .eq("client_id", auth.clientId)
      .eq("organization_id", auth.orgId)
      .neq("status", "Draft")
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    captureApiError(error, { route: "portal/invoices/[id]/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
