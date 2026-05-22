import * as Sentry from "@sentry/nextjs";

export function captureApiError(
  error: unknown,
  context?: Record<string, string>,
): void {
  console.error("[api]", context ?? {}, error);
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}
