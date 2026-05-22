# Manual steps after production hardening deploy

Run these in Supabase SQL Editor (once):

1. `supabase-stripe-webhook-events.sql` — Stripe webhook idempotency
2. `supabase-affiliates-rls-fix.sql` — tighten referrals INSERT policy

## Vercel environment variables (add if missing)

| Variable | Purpose |
|----------|---------|
| `ESTIMATE_ACTION_SECRET` | Signs client estimate approve links (or reuses `CRON_SECRET`) |
| `CRON_SECRET` | Protects cron + Vercel auto-injects on scheduled jobs |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Required in production (rate limits fail closed without them) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Contact form captcha |
| `NEXT_PUBLIC_APP_URL` | `https://www.dyluxepro.com` |

## Supabase Auth

Add redirect URL: `https://www.dyluxepro.com/reset-password` for password reset emails.

## Re-send estimate emails

Old approve links without `token` will not work. Re-send estimates after deploy so clients get signed links.
