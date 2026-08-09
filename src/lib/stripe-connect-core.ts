/**
 * Pure Stripe Connect helpers (no server secret / network deps).
 * Safe for node:test without path-alias resolution.
 */

export type ConnectStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  readyForPayments: boolean;
};

export function connectStatusFromOrg(org: {
  stripe_connect_account_id?: string | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_connect_details_submitted?: boolean | null;
} | null): ConnectStatus {
  const accountId = org?.stripe_connect_account_id ?? null;
  const chargesEnabled = Boolean(org?.stripe_connect_charges_enabled);
  const payoutsEnabled = Boolean(org?.stripe_connect_payouts_enabled);
  const detailsSubmitted = Boolean(org?.stripe_connect_details_submitted);
  return {
    accountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    readyForPayments: Boolean(accountId && chargesEnabled),
  };
}

/**
 * Optional platform fee in cents. Defaults to 0 so contractors keep the full
 * invoice amount until a product fee is configured.
 */
export function applicationFeeCents(
  amountCents: number,
  envFeeBps = process.env.STRIPE_CONNECT_APPLICATION_FEE_BPS,
): number {
  const bps = Number.parseInt(envFeeBps ?? "0", 10);
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  return Math.min(amountCents, Math.round((amountCents * bps) / 10_000));
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function checkoutIdempotencyKey(
  invoiceId: string,
  amountCents: number,
  attempt: number,
): string {
  const dayBucket = new Date().toISOString().slice(0, 10);
  return `inv_checkout_${invoiceId}_${amountCents}_${dayBucket}_${attempt}`;
}
