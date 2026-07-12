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

export type AuthErrorCode =
  | "email_taken"
  | "invalid_email"
  | "weak_password"
  | "invalid_password"
  | "rate_limited"
  | "signup_disabled"
  | "invalid_api_key"
  | "network"
  | "validation"
  | "unknown";

export type MappedAuthError = {
  code: AuthErrorCode;
  message: string;
};

/**
 * Map Supabase / network / validation errors to clear signup messages.
 * Prefer `code` from Auth API when present; fall back to message text.
 */
export function mapAuthError(
  error: unknown,
  opts?: { code?: string | null; details?: Record<string, string> },
): MappedAuthError {
  if (opts?.details && Object.keys(opts.details).length > 0) {
    const first = Object.entries(opts.details)[0]!;
    const field = first[0] === "_" ? "form" : first[0].replace(/_/g, " ");
    return {
      code: "validation",
      message: `${field}: ${first[1]}`,
    };
  }

  const apiCode = (opts?.code || "").toLowerCase();
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong. Please try again.";
  const lower = raw.toLowerCase();

  if (
    apiCode.includes("user_already") ||
    apiCode.includes("email_exists") ||
    lower.includes("user already registered") ||
    lower.includes("already been registered") ||
    lower.includes("email address has already been registered") ||
    lower.includes("already exists")
  ) {
    return {
      code: "email_taken",
      message:
        "This email is already in use. Try signing in, or use a different email.",
    };
  }

  if (
    apiCode.includes("weak_password") ||
    lower.includes("password should be") ||
    lower.includes("password is too weak") ||
    lower.includes("weak password")
  ) {
    return {
      code: "weak_password",
      message:
        raw.length > 8 && !lower.includes("auth")
          ? raw
          : "Password is too weak. Use at least 6 characters (longer is better).",
    };
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    (lower.includes("password") && lower.includes("invalid"))
  ) {
    return {
      code: "invalid_password",
      message: "Invalid email or password.",
    };
  }

  if (
    apiCode.includes("email") &&
    (apiCode.includes("invalid") || lower.includes("invalid email"))
  ) {
    return {
      code: "invalid_email",
      message: "Please enter a valid email address.",
    };
  }

  if (lower.includes("invalid email") || lower.includes("unable to validate email")) {
    return {
      code: "invalid_email",
      message: "Please enter a valid email address.",
    };
  }

  if (
    apiCode.includes("over_email") ||
    apiCode.includes("rate_limit") ||
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("email rate limit")
  ) {
    return {
      code: "rate_limited",
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  if (
    apiCode.includes("signup_disabled") ||
    lower.includes("signups not allowed") ||
    lower.includes("signup is disabled")
  ) {
    return {
      code: "signup_disabled",
      message:
        "New account creation is temporarily disabled. Please contact support.",
    };
  }

  if (
    lower.includes("invalid api key") ||
    lower.includes("invalid jwt") ||
    lower.includes("apikey") ||
    lower.includes("not configured")
  ) {
    return {
      code: "invalid_api_key",
      message:
        "Authentication is misconfigured (API keys). Please contact support.",
    };
  }

  if (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("521") ||
    lower.includes("504") ||
    lower.includes("gateway")
  ) {
    return {
      code: "network",
      message:
        "We couldn't reach our authentication service. This is usually temporary — wait a minute and try again. If it keeps failing, our database may need to be restored in Supabase.",
    };
  }

  if (
    !raw.trim() ||
    raw.trim() === "{}" ||
    raw.trim() === "[object Object]"
  ) {
    return {
      code: "unknown",
      message:
        "Signup was rejected by Supabase with no details. Usually this means a database trigger failed (check Auth logs), Confirm email / redirect URL settings, or mismatched API keys. Open Supabase → Authentication → Logs for the real error.",
    };
  }

  return {
    code: "unknown",
    message: raw || "Something went wrong. Please try again.",
  };
}

/** Map Supabase / network errors to user-friendly signup messages. */
export function formatAuthErrorMessage(error: unknown): string {
  return mapAuthError(error).message;
}
