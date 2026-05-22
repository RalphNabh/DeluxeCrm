/**
 * Centralized environment helpers — consistent URLs and dev-only fallbacks.
 */

const PRODUCTION_APP_URL = "https://www.dyluxepro.com";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Canonical app URL for emails, Stripe redirects, and metadata. */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (isProduction()) return PRODUCTION_APP_URL;
  return "http://localhost:3000";
}

/** Resend test recipient — only used in development when env is unset. */
export function getResendTestEmail(): string | undefined {
  if (process.env.RESEND_VERIFIED_EMAIL) {
    return process.env.RESEND_VERIFIED_EMAIL;
  }
  return isDevelopment() ? undefined : undefined;
}

/** Contact form destination — required in production. */
export function getContactEmail(): string {
  return (
    process.env.CONTACT_EMAIL ||
    process.env.RESEND_VERIFIED_EMAIL ||
    (isDevelopment() ? "dev@localhost" : "support@dyluxepro.com")
  );
}
