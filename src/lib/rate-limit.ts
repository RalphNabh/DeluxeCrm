import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

/**
 * Best-effort IP-based rate limiter for public, unauthenticated endpoints.
 *
 * Configuration via env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If env vars are absent (e.g. local dev without Upstash) the limiter
 * fails OPEN (allows the request). All production deployments MUST set
 * these vars; absence is logged once at module load.
 */

type LimiterKey =
  | "public-default"
  | "public-strict"
  | "contact"
  | "ai-estimate"
  | "email-action"
  | "email-send"
  | "signup";

const limiters = new Map<LimiterKey, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. " +
          "Rate limiting is DISABLED. Configure in Vercel env vars."
      );
    }
    return null;
  }
  return new Redis({ url, token });
}

const redis = getRedis();

function getLimiter(key: LimiterKey): Ratelimit | null {
  if (!redis) return null;
  if (limiters.has(key)) return limiters.get(key)!;

  let limiter: Ratelimit;
  switch (key) {
    case "public-strict":
      // 5 requests per minute (e.g. estimate public lookup)
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "rl:public-strict",
        analytics: true,
      });
      break;
    case "contact":
      // 3 requests per 10 minutes (contact form is highly abusable)
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "10 m"),
        prefix: "rl:contact",
        analytics: true,
      });
      break;
    case "ai-estimate":
      // 10 vision calls per minute per user. Backstop against accidental
      // double-submits and runaway client retries. Monthly plan quota is
      // enforced separately in src/lib/ai/quota.ts.
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "rl:ai-estimate",
        analytics: true,
      });
      break;
    case "email-action":
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "10 m"),
        prefix: "rl:email-action",
        analytics: true,
      });
      break;
    case "email-send":
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "10 m"),
        prefix: "rl:email-send",
        analytics: true,
      });
      break;
    case "signup":
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "rl:signup",
        analytics: true,
      });
      break;
    case "public-default":
    default:
      // 30 requests per minute, generous default
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "rl:public-default",
        analytics: true,
      });
      break;
  }
  limiters.set(key, limiter);
  return limiter;
}

function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to a stable bucket so the
  // limiter still groups callers when no IP is available.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  request: NextRequest,
  key: LimiterKey = "public-default",
  /**
   * Optional identifier to bucket by. Use a user id for authenticated
   * endpoints so the limit is per-account rather than per-IP. Falls back
   * to the request IP when omitted.
   */
  identifier?: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(key);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, limit: 0, remaining: 0, reset: 0 };
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  const bucket = identifier?.trim() || getClientIp(request);
  const result = await limiter.limit(bucket);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Returns standard rate-limit headers to include on a response.
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
