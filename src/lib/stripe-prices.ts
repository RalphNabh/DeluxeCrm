/** Allowed Stripe price IDs from environment (checkout allowlist). */
export function getAllowedStripePriceIds(): string[] {
  return [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
  ].filter((id): id is string => Boolean(id && id.startsWith("price_")));
}

export function isAllowedStripePriceId(priceId: string): boolean {
  const allowed = getAllowedStripePriceIds();
  if (allowed.length === 0) return false;
  return allowed.includes(priceId);
}
