import { Resend } from "resend";

/**
 * Resend client, created on first use.
 *
 * Never construct Resend at module scope. Next.js evaluates route modules while
 * collecting page data during `next build`, so a top-level `new Resend(...)`
 * makes the production build fail unless RESEND_API_KEY is present at build
 * time — which it should not need to be.
 */
let client: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in your environment variables.",
    );
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sender address for transactional email, overridable per environment. */
export function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL || "DyluxePro <onboarding@resend.dev>"
  );
}
