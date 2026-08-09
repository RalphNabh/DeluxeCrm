import { NextRequest } from "next/server";

/**
 * Authorize Vercel cron / manual cron hits.
 * Accepts Authorization: Bearer CRON_SECRET or ?secret=CRON_SECRET.
 * When CRON_SECRET is unset, allow only outside production.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const querySecret = request.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}
