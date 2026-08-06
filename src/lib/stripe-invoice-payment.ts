import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { sumPayments, today } from "@/lib/payments";
import { invoiceStatusAfterPayment } from "@/lib/route-access";
import { createStripeClient } from "@/lib/stripe-server";

export type RecordStripePaymentResult = {
  recorded: boolean;
  reason?: string;
  refunded?: boolean;
};

async function clearPendingCheckout(
  admin: SupabaseClient,
  invoiceId: string,
  sessionId: string | null,
): Promise<void> {
  let query = admin
    .from("invoices")
    .update({
      pending_checkout_session_id: null,
      pending_checkout_amount: null,
      pending_checkout_created_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (sessionId) {
    query = query.eq("pending_checkout_session_id", sessionId);
  }

  await query;
}

async function refundCheckoutPayment(
  session: Stripe.Checkout.Session,
  reason: string,
): Promise<boolean> {
  const stripe = createStripeClient();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    Sentry.captureMessage(
      `[invoice payment] Cannot refund session ${session.id}: no payment_intent (${reason})`,
      "error",
    );
    return false;
  }

  try {
    await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "duplicate",
        metadata: {
          reason,
          invoiceId: session.metadata?.invoiceId ?? "",
          checkoutSessionId: session.id,
        },
      },
      { idempotencyKey: `refund_${session.id}_${reason}` },
    );
    Sentry.captureMessage(
      `[invoice payment] Auto-refunded session ${session.id}: ${reason}`,
      "warning",
    );
    return true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "stripe-invoice-payment", step: "refund" },
      extra: { sessionId: session.id, reason },
    });
    throw error;
  }
}

/**
 * Record a Stripe Checkout invoice payment and refresh invoice status.
 * Idempotent on checkout session id / payment intent id.
 * Overpay / already-paid sessions are auto-refunded (plan decision 1A).
 */
export async function recordStripeInvoicePayment(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<RecordStripePaymentResult> {
  if (session.metadata?.type !== "invoice_payment") {
    return { recorded: false, reason: "not_invoice_payment" };
  }

  const invoiceId = session.metadata.invoiceId;
  const orgId = session.metadata.orgId;
  if (!invoiceId || !orgId) {
    return { recorded: false, reason: "missing_metadata" };
  }

  if (session.payment_status !== "paid") {
    return { recorded: false, reason: "not_paid" };
  }

  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (sessionId) {
    const { data: bySession } = await admin
      .from("payments")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (bySession) {
      await clearPendingCheckout(admin, invoiceId, sessionId);
      return { recorded: false, reason: "duplicate_session" };
    }
  }

  if (paymentIntentId) {
    const { data: byPi } = await admin
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (byPi) {
      await clearPendingCheckout(admin, invoiceId, sessionId);
      return { recorded: false, reason: "duplicate_pi" };
    }
  }

  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .select("id, total, status, user_id, organization_id")
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .single();

  if (invoiceError || !invoice) {
    return { recorded: false, reason: "invoice_not_found" };
  }

  const amountCents = session.amount_total ?? 0;
  const amount = amountCents / 100;
  if (!(amount > 0)) {
    return { recorded: false, reason: "zero_amount" };
  }

  const { data: existingPayments } = await admin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const alreadyPaid = sumPayments(existingPayments);
  const remaining = Number(invoice.total) - alreadyPaid;

  if (remaining <= 0.01) {
    const refunded = await refundCheckoutPayment(session, "already_paid");
    await clearPendingCheckout(admin, invoiceId, sessionId);
    return { recorded: false, reason: "already_paid", refunded };
  }

  if (amount > remaining + 0.01) {
    // Prefer recording only the remaining balance is not possible with a single
    // PI — refund the whole duplicate/overpay session per plan decision 1A.
    const refunded = await refundCheckoutPayment(session, "overpay");
    await clearPendingCheckout(admin, invoiceId, sessionId);
    return { recorded: false, reason: "overpay", refunded };
  }

  const { error: insertError } = await admin.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    payment_method: "Credit Card",
    payment_date: today(),
    reference: sessionId,
    notes: "Paid online via Stripe Checkout",
    user_id: invoice.user_id,
    organization_id: orgId,
    source: "stripe",
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      await clearPendingCheckout(admin, invoiceId, sessionId);
      return { recorded: false, reason: "duplicate_insert" };
    }
    throw insertError;
  }

  const { data: allPayments } = await admin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const totalPaid = sumPayments(allPayments);
  const newStatus = invoiceStatusAfterPayment(
    Number(invoice.total),
    totalPaid,
    invoice.status,
  );

  await admin
    .from("invoices")
    .update({
      status: newStatus,
      paid_at: newStatus === "Paid" ? new Date().toISOString() : null,
      pending_checkout_session_id: null,
      pending_checkout_amount: null,
      pending_checkout_created_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  return { recorded: true };
}

/** Server-side confirmation for return URLs (never trust ?paid=1 alone). */
export async function confirmCheckoutSessionForInvoice(
  admin: SupabaseClient,
  input: { sessionId: string; invoiceId: string; orgId: string },
): Promise<{ paid: boolean; status?: string; reason?: string }> {
  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);

  if (session.metadata?.type !== "invoice_payment") {
    return { paid: false, reason: "not_invoice_payment" };
  }
  if (session.metadata.invoiceId !== input.invoiceId) {
    return { paid: false, reason: "invoice_mismatch" };
  }
  if (session.metadata.orgId !== input.orgId) {
    return { paid: false, reason: "org_mismatch" };
  }

  if (session.payment_status === "paid") {
    // Best-effort sync if webhook is delayed.
    await recordStripeInvoicePayment(admin, session);
    const { data: invoice } = await admin
      .from("invoices")
      .select("status")
      .eq("id", input.invoiceId)
      .maybeSingle();
    return { paid: true, status: invoice?.status };
  }

  return { paid: false, reason: session.payment_status ?? "unpaid" };
}
