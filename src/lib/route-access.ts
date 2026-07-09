/** Pure route classification for middleware (unit-testable). */

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/contact",
  "/estimate-action",
  "/account-verified",
  "/terms",
  "/privacy",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
  "/client-login",
]);

const PUBLIC_PREFIXES = [
  "/signup/",
  "/auth/",
  "/invite/",
  "/portal/register",
];

const SUBSCRIPTION_EXEMPT_PREFIXES = [
  "/subscription",
  "/settings",
  "/api",
  "/profile",
  "/portal",
  "/field",
  "/invite",
];

export function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/** API routes enforce their own auth; middleware must not redirect them to /login. */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function isSubscriptionExempt(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_PREFIXES.some((route) =>
    pathname.startsWith(route),
  );
}

/** Pipeline stage → automation trigger (excludes "New Leads" — use client_created / lead POST). */
export const LEAD_STAGE_AUTOMATION_EVENTS: Record<string, string> = {
  "Estimate Sent": "lead_estimate_sent",
  Approved: "lead_approved",
  "Job Scheduled": "lead_job_scheduled",
  Completed: "lead_completed",
};

export function leadAutomationEventForStatus(
  newStatus: string,
  oldStatus: string | undefined,
): string | null {
  if (!oldStatus || oldStatus === newStatus) return null;
  return LEAD_STAGE_AUTOMATION_EVENTS[newStatus] ?? null;
}

/** 13% tax — shared by estimates and invoices. */
export function calculateTaxAndTotal(
  lineItems: { quantity: number; unit_price: number }[],
): { subtotal: number; tax: number; total: number } {
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_price,
    0,
  );
  const tax = Math.round(subtotal * 0.13 * 100) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

export function invoiceStatusAfterPayment(
  invoiceTotal: number,
  totalPaid: number,
  currentStatus: string,
): string {
  if (totalPaid >= invoiceTotal) return "Paid";
  if (totalPaid > 0) return "Partially Paid";
  return currentStatus;
}
