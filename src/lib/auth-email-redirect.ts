/** Canonical redirect target for signup / verification emails. */
export function getEmailConfirmationRedirectUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback?next=/account-verified`;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.dyluxepro.com";
  return `${base}/auth/callback?next=/account-verified`;
}

export const SIGNUP_PENDING_EMAIL_KEY = "signupEmailPending";

/** Map Supabase / network errors to user-friendly signup messages. */
export function formatAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong. Please try again.";

  const lower = raw.toLowerCase();

  if (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("521") ||
    lower.includes("504") ||
    lower.includes("gateway")
  ) {
    return "We couldn't reach our authentication service. This is usually temporary — wait a minute and try again. If it keeps failing, our database may need to be restored in Supabase.";
  }

  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (lower.includes("password")) {
    return raw;
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  return raw || "Something went wrong. Please try again.";
}
