import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireOrgMember, requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { getAppUrl } from "@/lib/env";
import { sumPayments } from "@/lib/payments";
import {
  checkoutIdempotencyKey,
  createInvoiceCheckoutSession,
  dollarsToCents,
  expireCheckoutSession,
  retrieveOpenCheckoutSession,
  syncConnectAccountStatus,
} from "@/lib/stripe-connect";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveInvoiceAccess(
  invoiceId: string,
): Promise<
  | {
      ok: true;
      orgId: string;
      viaPortal: boolean;
      invoice: {
        id: string;
        invoice_number: string;
        total: number;
        status: string;
        organization_id: string;
        client_id: string;
        clients?: { email?: string | null } | null;
      };
    }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();

  const orgAuth = await requireOrgMember(supabase);
  if (orgAuth.ok) {
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, total, status, organization_id, client_id, clients(email)",
      )
      .eq("id", invoiceId)
      .eq("organization_id", orgAuth.ctx.orgId)
      .single();

    if (error || !invoice) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invoice not found" }, { status: 404 }),
      };
    }

    return {
      ok: true,
      orgId: orgAuth.ctx.orgId,
      viaPortal: false,
      invoice: invoice as {
        id: string;
        invoice_number: string;
        total: number;
        status: string;
        organization_id: string;
        client_id: string;
        clients?: { email?: string | null } | null;
      },
    };
  }

  const portalAuth = await requirePortalUser(supabase);
  if (!portalAuth.ok) return { ok: false, response: portalAuth.response };

  const admin = createServiceRoleClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select(
      "id, invoice_number, total, status, organization_id, client_id, clients(email)",
    )
    .eq("id", invoiceId)
    .eq("organization_id", portalAuth.orgId)
    .eq("client_id", portalAuth.clientId)
    .single();

  if (error || !invoice) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invoice not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    orgId: portalAuth.orgId,
    viaPortal: true,
    invoice: invoice as {
      id: string;
      invoice_number: string;
      total: number;
      status: string;
      organization_id: string;
      client_id: string;
      clients?: { email?: string | null } | null;
    },
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id: invoiceId } = await context.params;
    const access = await resolveInvoiceAccess(invoiceId);
    if (!access.ok) return access.response;

    const { invoice, orgId, viaPortal } = access;

    if (["Paid", "Cancelled", "Draft"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice cannot be paid while status is ${invoice.status}` },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();
    const connect = await syncConnectAccountStatus(admin, orgId);
    if (!connect.readyForPayments || !connect.accountId) {
      return NextResponse.json(
        {
          error:
            "Online payments are not set up yet. The contractor must finish Stripe Connect onboarding.",
        },
        { status: 402 },
      );
    }

    const { data: existingPayments } = await admin
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice.id);

    const alreadyPaid = sumPayments(existingPayments);
    const remaining = Number(invoice.total) - alreadyPaid;
    if (remaining <= 0.001) {
      return NextResponse.json(
        { error: "Invoice is already fully paid" },
        { status: 400 },
      );
    }

    const remainingCents = dollarsToCents(remaining);

    // Re-read pending session under service role (refresh / double-click safe).
    const { data: locked } = await admin
      .from("invoices")
      .select(
        "pending_checkout_session_id, pending_checkout_amount, pending_checkout_created_at",
      )
      .eq("id", invoice.id)
      .single();

    const pendingId = locked?.pending_checkout_session_id as string | null;
    const pendingAmount = locked?.pending_checkout_amount != null
      ? Number(locked.pending_checkout_amount)
      : null;

    if (
      pendingId &&
      pendingAmount != null &&
      Math.abs(pendingAmount - remaining) < 0.011
    ) {
      const open = await retrieveOpenCheckoutSession(pendingId);
      if (open?.url) {
        return NextResponse.json({ url: open.url, sessionId: open.id, reused: true });
      }
      await expireCheckoutSession(pendingId);
    } else if (pendingId) {
      await expireCheckoutSession(pendingId);
    }

    const appUrl = getAppUrl();
    const clientEmail =
      (invoice.clients as { email?: string | null } | null)?.email ?? null;

    const returnBase = viaPortal
      ? `${appUrl}/portal/invoices/${invoice.id}`
      : `${appUrl}/invoices/${invoice.id}`;

    const attempt = pendingId ? 2 : 1;
    const session = await createInvoiceCheckoutSession({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amountDue: remaining,
      customerEmail: clientEmail,
      orgId,
      connectedAccountId: connect.accountId,
      successUrl: `${returnBase}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${returnBase}?cancelled=1`,
      idempotencyKey: checkoutIdempotencyKey(invoice.id, remainingCents, attempt),
    });

    await admin
      .from("invoices")
      .update({
        pending_checkout_session_id: session.id,
        pending_checkout_amount: remaining,
        pending_checkout_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    captureApiError(error, { route: "invoices/[id]/checkout/POST" });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
