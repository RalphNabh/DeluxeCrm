import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient } from "@/lib/stripe-server";
import { getAppUrl } from "@/lib/env";
import {
  applicationFeeCents,
  checkoutIdempotencyKey,
  connectStatusFromOrg,
  dollarsToCents,
  type ConnectStatus,
} from "@/lib/stripe-connect-core";

export type { ConnectStatus };
export {
  applicationFeeCents,
  checkoutIdempotencyKey,
  connectStatusFromOrg,
  dollarsToCents,
};

/** Create or reuse an Express account and return an Account Link URL. */
export async function createConnectOnboardingLink(
  supabase: SupabaseClient,
  orgId: string,
  ownerEmail?: string | null,
): Promise<{ url: string; accountId: string }> {
  const stripe = createStripeClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "id, name, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted",
    )
    .eq("id", orgId)
    .single();

  if (error || !org) {
    throw new Error("Organization not found");
  }

  let accountId = org.stripe_connect_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: ownerEmail ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: org.name ?? undefined,
      },
      metadata: { orgId },
    });
    accountId = account.id;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        stripe_connect_account_id: accountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const appUrl = getAppUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/settings?connect=refresh`,
    return_url: `${appUrl}/settings?connect=return`,
    type: "account_onboarding",
  });

  return { url: link.url, accountId };
}

/** Pull live Connect flags from Stripe and persist them on the organization. */
export async function syncConnectAccountStatus(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ConnectStatus> {
  const stripe = createStripeClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted",
    )
    .eq("id", orgId)
    .single();

  if (error || !org) {
    throw new Error("Organization not found");
  }

  if (!org.stripe_connect_account_id) {
    return connectStatusFromOrg(org);
  }

  const account = await stripe.accounts.retrieve(org.stripe_connect_account_id);
  const patch = {
    stripe_connect_charges_enabled: Boolean(account.charges_enabled),
    stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
    stripe_connect_details_submitted: Boolean(account.details_submitted),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("organizations").update(patch).eq("id", orgId);

  return connectStatusFromOrg({
    stripe_connect_account_id: org.stripe_connect_account_id,
    ...patch,
  });
}

/** Expire an open Checkout session; ignore already-terminal sessions. */
export async function expireCheckoutSession(
  sessionId: string,
): Promise<void> {
  const stripe = createStripeClient();
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") {
      await stripe.checkout.sessions.expire(sessionId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Missing / already expired sessions are fine — continue to create a new one.
    if (!/No such checkout.session|has already been expired|cannot be expired/i.test(message)) {
      throw error;
    }
  }
}

export async function retrieveOpenCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session | null> {
  const stripe = createStripeClient();
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open" && session.url) return session;
    return null;
  } catch {
    return null;
  }
}

/** Build a destination-charge Checkout Session for an unpaid invoice balance. */
export async function createInvoiceCheckoutSession(input: {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  currency?: string;
  customerEmail?: string | null;
  orgId: string;
  connectedAccountId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = createStripeClient();
  const amountCents = dollarsToCents(input.amountDue);
  if (amountCents < 50) {
    throw new Error("Amount due must be at least $0.50");
  }

  const fee = applicationFeeCents(amountCents);

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (input.currency ?? "usd").toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: `Invoice ${input.invoiceNumber}`,
              description: `Payment for invoice ${input.invoiceNumber}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee > 0 ? fee : undefined,
        transfer_data: {
          destination: input.connectedAccountId,
        },
        metadata: {
          type: "invoice_payment",
          invoiceId: input.invoiceId,
          orgId: input.orgId,
        },
      },
      metadata: {
        type: "invoice_payment",
        invoiceId: input.invoiceId,
        orgId: input.orgId,
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    input.idempotencyKey
      ? { idempotencyKey: input.idempotencyKey }
      : undefined,
  );
}
