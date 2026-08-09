import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireOrgMember, requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { confirmCheckoutSessionForInvoice } from "@/lib/stripe-invoice-payment";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: invoiceId } = await context.params;
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    let orgId: string | null = null;

    const orgAuth = await requireOrgMember(supabase);
    if (orgAuth.ok) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("id", invoiceId)
        .eq("organization_id", orgAuth.ctx.orgId)
        .maybeSingle();
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      orgId = orgAuth.ctx.orgId;
    } else {
      const portalAuth = await requirePortalUser(supabase);
      if (!portalAuth.ok) return portalAuth.response;

      const admin = createServiceRoleClient();
      const { data: invoice } = await admin
        .from("invoices")
        .select("id")
        .eq("id", invoiceId)
        .eq("organization_id", portalAuth.orgId)
        .eq("client_id", portalAuth.clientId)
        .maybeSingle();
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      orgId = portalAuth.orgId;
    }

    const admin = createServiceRoleClient();
    const result = await confirmCheckoutSessionForInvoice(admin, {
      sessionId,
      invoiceId,
      orgId: orgId!,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureApiError(error, { route: "invoices/[id]/confirm-checkout/GET" });
    return NextResponse.json(
      { error: "Failed to confirm checkout session" },
      { status: 500 },
    );
  }
}
