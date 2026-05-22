# PR #1 — Stabilize: Notes & Manual Steps

This PR locks down the codebase before the AI / repositioning work begins.

## What's in this PR (code changes)

### Engineering hygiene
- Reverted 17 dirty files that contained only trailing-newline noise.
- Re-enabled ESLint in `next.config.ts` (`ignoreDuringBuilds: false`).
- Relaxed three rules to `warn` in `eslint.config.mjs` (`no-explicit-any`,
  `no-empty-object-type`, `react/no-unescaped-entities`, `prefer-const`) so
  the build passes today; tracked in PR #1.5 to tighten back to `error`.
- TypeScript build-error checking remains disabled with a clear FIXME
  comment naming the three migrations needed before re-enabling:
  Next 15 `params: Promise<...>`, Stripe SDK v20 API changes, and
  Supabase joined-row typings. **This is PR #1.5.**

### Security hardening
- New `src/lib/rate-limit.ts` — Upstash-Redis-backed sliding-window IP rate
  limiter with three keys (`public-default`, `public-strict`, `contact`).
  Fails open in dev when env vars are missing; logs a warning in prod.
- New `src/lib/validation.ts` — `zod` body + query parsing helpers that
  return structured 400 responses on validation failure.
- `src/app/api/estimates/public/route.ts` — added `public-strict` rate
  limit (5/min per IP) + zod query validation (UUID enforced).
- `src/app/api/contact/route.ts` — added `contact` rate limit
  (3 per 10 min per IP), zod body validation, hidden honeypot field
  (`website`), and Cloudflare Turnstile token verification (server-side
  only — see manual steps below for the front-end widget).
- Stripe webhook signature verification was already enforced — verified
  at `src/app/api/stripe/webhook/route.ts:60`.

### Error tracking
- Installed `@sentry/nextjs`.
- `sentry.client.config.ts`, `sentry.server.config.ts`,
  `sentry.edge.config.ts`, and `instrumentation.ts` are wired up but only
  activate when a DSN env var is present, so dev is unaffected.

### New dependencies
- `zod`
- `@upstash/ratelimit`
- `@upstash/redis`
- `@sentry/nextjs`

---

## Manual steps you must do (Vercel + accounts)

These cannot be done from code. Do them in this order.

### 1. Rotate keys (do this first)
The `DEPLOYMENT_NEXT_STEPS.md` file flagged that keys may have been exposed
on the prior vulnerable Next.js version. Rotate everything:

- **Supabase** → Project Settings → API → Reset `service_role` key. Update
  Vercel env var `SUPABASE_SERVICE_ROLE_KEY`.
- **Stripe** → Developers → API keys → Roll secret key. Update Vercel env
  var `STRIPE_SECRET_KEY`.
- **Stripe webhook** → Webhooks → Reveal/regenerate the signing secret.
  Update `STRIPE_WEBHOOK_SECRET`.
- **Resend** → API Keys → Delete and recreate. Update `RESEND_API_KEY`.
- After updating each, redeploy from Vercel to apply.

### 2. Set up Upstash Redis (for rate limiting)

1. Go to [upstash.com](https://upstash.com), create a free account.
2. Create a new Redis database (free tier — Global, region near Vercel).
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
4. Add both to Vercel → Project → Settings → Environment Variables (all
   three environments: Production, Preview, Development).
5. Redeploy. Verify by hitting `/api/contact` 4 times within 10 minutes —
   the 4th should return HTTP 429.

### 3. Set up Cloudflare Turnstile (captcha for contact form)

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Add a site → Widget mode `Managed` → Domain `dyluxepro.com`.
3. Copy the **Site Key** and **Secret Key**.
4. Add to Vercel:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = site key (public, used by widget)
   - `TURNSTILE_SECRET_KEY` = secret key (server-side verification)
5. **Front-end widget integration is NOT yet in this PR.** When ready,
   add the `<Turnstile>` widget to `src/app/contact/page.tsx` and pass
   the resulting token as `turnstileToken` in the POST body. The backend
   will then verify it. Until you add the widget, the backend treats
   missing tokens as OK *only if* `TURNSTILE_SECRET_KEY` is unset; once
   set, it will reject any request without a valid token. Set
   `TURNSTILE_SECRET_KEY` *after* you ship the widget.

### 4. Set up Sentry (error tracking)

1. Go to [sentry.io](https://sentry.io), create a free account.
2. Create a new project → platform: Next.js → name: `dyluxepro`.
3. Copy the DSN.
4. Add to Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN` = DSN (used on client + server)
   - (Optional, for source-map uploads) `SENTRY_AUTH_TOKEN`,
     `SENTRY_ORG`, `SENTRY_PROJECT`. To enable source-maps, also wrap
     `next.config.ts` with `withSentryConfig`. Defer until needed.
5. Redeploy. Trigger a test error to confirm it shows in Sentry.

### 5. Verify

After all of the above, verify:

- [ ] `npm run build` passes locally.
- [ ] `npx next lint` exits 0 (warnings OK, no errors).
- [ ] Production homepage loads without console errors.
- [ ] Hit `/api/estimates/public?estimateId=not-a-uuid` → returns 400
      with structured zod error.
- [ ] Hit `/api/contact` 4 times in 10 min from same IP → 4th is 429.
- [ ] Throw a test error somewhere → appears in Sentry within 1 minute.
- [ ] Stripe test-mode subscription end-to-end: checkout → webhook fires
      → DB row created.

---

## What did NOT get done (and why) — opens follow-up PRs

### PR #1.5 — TypeScript strict re-enable
~30 real TS errors uncovered. Categories:

1. **Next 15 dynamic route handler signature change** —
   `[id]/route.ts` files use the old `{ params: { id: string } }`
   shape; Next 15 made it `{ params: Promise<{ id: string }> }`. Every
   dynamic route needs `const { id } = await context.params`. Tracked
   files include `api/clients/[id]`, `api/jobs/[id]`, `api/leads/[id]`,
   `api/invoices/[id]`, `api/team/[id]`, `api/automations/[id]`,
   `api/automations/[id]/test`, `api/pipeline-stages/[id]`,
   `api/estimates/[id]`, `api/client-folders/[id]`, `api/materials/[id]`,
   `api/tasks/[id]`. **The build was masking a real runtime risk.**
2. **Stripe SDK v20 API changes** — `subscription.current_period_*`
   moved to `subscription.items.data[0].current_period_*`; `invoice
   .subscription` moved under `invoice.parent.subscription_details`.
   Touches `api/stripe/webhook/route.ts` and `api/stripe/create-checkout`.
3. **Supabase joined-row typing** — `clients(email)` returns an array in
   the type system; needs explicit `.maybeSingle()` or row casting.

This is its own PR because it touches money-handling code and needs
careful manual testing in Stripe test mode.

### PR #1.6 — Type cleanup pass
Fix the ~50 `any` types and ~20 unescaped-entities warnings that we
relaxed to `warn`. Then tighten the rules back to `error`.

---

## Commit suggestion

```
chore: stabilize codebase pre-pivot

- Re-enable ESLint in build (TS deferred to PR#1.5)
- Add zod validation + Upstash rate limiting on public endpoints
- Add Cloudflare Turnstile server-side verification (front-end TBD)
- Add Sentry SDK (activates when DSN env var is set)
- Revert 17 trailing-newline-only diffs

See PR1_STABILIZE_NOTES.md for full rationale and manual setup steps.
```
