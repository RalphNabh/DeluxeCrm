/** Shape of a recorded payment, matching the columns on `public.payments`. */
export type PaymentInsert = {
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  user_id: string;
  organization_id: string;
};

export type PaymentInput = {
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date?: string;
  reference?: string | null;
  notes?: string | null;
};

/** Today as YYYY-MM-DD, the format `payments.payment_date` (a date) expects. */
export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Build the row to insert for a recorded payment.
 * Field names match the DB columns exactly (not method/paid_at).
 */
export function buildPaymentInsert(
  input: PaymentInput,
  actor: { userId: string; orgId: string },
): PaymentInsert {
  return {
    invoice_id: input.invoice_id,
    amount: input.amount,
    payment_method: input.payment_method,
    payment_date: input.payment_date ?? today(),
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    user_id: actor.userId,
    organization_id: actor.orgId,
  };
}

/** Sum of recorded payments, tolerating rows that failed to parse. */
export function sumPayments(
  payments: ReadonlyArray<{ amount: number | string | null }> | null | undefined,
): number {
  return (payments ?? []).reduce((total, payment) => {
    const amount =
      typeof payment.amount === "string"
        ? Number.parseFloat(payment.amount)
        : payment.amount;
    return total + (Number.isFinite(amount) ? (amount as number) : 0);
  }, 0);
}
