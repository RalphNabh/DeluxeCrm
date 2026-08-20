# DyluxePro — Production launch checklist

Actionable checklist mapped to this repo. Use it before inviting paying customers.

**Related docs:** [DEPLOYMENT_NEXT_STEPS.md](../DEPLOYMENT_NEXT_STEPS.md) · [STRIPE_SETUP_GUIDE.md](../STRIPE_SETUP_GUIDE.md) · [supabase/README.md](../supabase/README.md) · [CI workflow](../.github/workflows/ci.yml)

**Legend:** `[ ]` todo · `[x]` done · `⚠` known gap in code — verify before launch

---

## 0. Launch readiness snapshot

| Area | Built in code? | Production configured? |
|------|----------------|------------------------|
| CRM (clients, leads, estimates, invoices, jobs) | Yes | Verify on prod |
| Client Hub + messaging | Yes | Realtime + migrations on hosted Supabase |
| Auth (signup, verify, reset) | Yes | Supabase Auth URLs + email |
| SaaS billing (Stripe subscriptions) | Yes | Live keys + webhook + prices |
| Client invoice payments (Stripe Connect) | Yes | Each org onboards in Settings |
| Email (Resend) | Yes | Domain verified, not `onboarding@resend.dev` |
| Rate limiting | Yes | Upstash env vars required in prod |
| Crons (automations, visits, AI cleanup) | Yes | `CRON_SECRET` in Vercel |
| Error monitoring (Sentry) | Yes | DSN in Vercel |
| Privacy / Terms | Basic pages | Lawyer review recommended |
| CI (lint, test, build, migrations) | Yes | Must stay green on `main` |

---

## 1. Vercel — environment variables

Set in **Project → Settings → Environment Variables** (Production + Preview as needed).

### 1.1 Required (app will break without these)

| Variable | Used in | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/*.ts`, webhook | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/*.ts` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/server.ts`, webhooks, crons, account deletion | **Secret** — server only |
| `NEXT_PUBLIC_APP_URL` | `src/lib/env.ts`, emails, Stripe redirects, `src/app/layout.tsx` | e.g. `https://www.dyluxepro.com` (no trailing slash) |
| `RESEND_API_KEY` | `src/lib/email/resend-client.ts`, send routes | Required for transactional email |
| `RESEND_FROM_EMAIL` | `src/lib/email/resend-client.ts` | After domain verify: `DyluxePro <noreply@yourdomain.com>` |
| `STRIPE_SECRET_KEY` | `src/lib/stripe-server.ts` | Live: `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout (client) | Live: `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/stripe/webhook/route.ts` | From Stripe webhook endpoint |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER` | `src/lib/stripe-prices.ts`, `src/app/subscription/page.tsx` | Must start with `price_` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL` | same | Allowlist in checkout |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE` | same | Allowlist in checkout |

- [ ] All required vars set for **Production**
- [ ] Placeholder keys from CI (`.github/workflows/ci.yml`) are **not** used in Production
- [ ] Redeploy after changing env vars

### 1.2 Strongly recommended (security / reliability)

| Variable | Used in | If missing |
|----------|---------|------------|
| `CRON_SECRET` | `src/lib/automations/cron-auth.ts`, `src/app/api/ai-estimates/cron/cleanup/route.ts` | Crons blocked in production |
| `ESTIMATE_ACTION_SECRET` | `src/lib/estimate-action-token.ts` | Falls back to `CRON_SECRET` or service role key |
| `UPSTASH_REDIS_REST_URL` | `src/lib/rate-limit.ts` | Rate limiting **disabled** (logged warning) |
| `UPSTASH_REDIS_REST_TOKEN` | `src/lib/rate-limit.ts` | same |
| `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` | `sentry.*.config.ts`, `src/lib/api-error.ts` | No error tracking |
| `CONTACT_EMAIL` | `src/lib/env.ts`, contact form | Falls back to `support@dyluxepro.com` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `src/components/turnstile-widget.tsx`, `src/app/contact/page.tsx` | Contact spam unprotected |
| `TURNSTILE_SECRET_KEY` | `src/app/api/contact/route.ts` | Turnstile not verified server-side |

- [ ] `CRON_SECRET` set (random 32+ chars)
- [ ] Upstash Redis configured
- [ ] Sentry DSN configured
- [ ] Turnstile keys configured (contact form)

### 1.3 Optional (feature-specific)

| Variable | Feature | File(s) |
|----------|---------|---------|
| `OPENAI_API_KEY` | AI photo estimates | `src/lib/ai/vision.ts`, `src/app/api/ai-estimates/analyze/route.ts` |
| `OPENAI_VISION_MODEL` | AI model override | `src/lib/ai/vision.ts` (default `gpt-4o-mini`) |
| `OPENAI_PRICING_MODEL` | Catalog match | `src/lib/ai/catalog-match.ts` |
| `TWILIO_ACCOUNT_SID` | SMS automations | `src/lib/sms/twilio.ts` |
| `TWILIO_AUTH_TOKEN` | SMS automations | same |
| `TWILIO_FROM_NUMBER` | SMS automations | same |
| `STRIPE_CONNECT_APPLICATION_FEE_BPS` | Connect platform fee | `src/lib/stripe-connect-core.ts` |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry source maps | `next.config.ts` |
| `RESEND_VERIFIED_EMAIL` | Dev/test email override | **Do not rely on in production** |

- [ ] AI estimates: OpenAI key set (or disable AI routes in UI/marketing)
- [ ] SMS automations: Twilio set (or document “email only”)

### 1.4 Domain & deployment

- [ ] Custom domain connected in Vercel (`dyluxepro.com` / `www`)
- [ ] `NEXT_PUBLIC_APP_URL` matches canonical domain (`src/lib/env.ts` defaults to `https://www.dyluxepro.com` in prod)
- [ ] SSL active (automatic on Vercel)
- [ ] Production deploy succeeds (`npm run build` — same as CI)

**CI reference:** `.github/workflows/ci.yml` runs `npm run lint`, `npm run test`, `npm run build`, and `./scripts/verify-migrations.sh`.

---

## 2. Supabase (hosted project)

Project ref (current): `pmozvpszerfwbegptlar` — confirm in dashboard before running commands.

### 2.1 Apply migrations

All schema lives in `supabase/migrations/` (never add `.sql` to repo root — CI rejects it).

| Migration file | Purpose |
|----------------|---------|
| `00000000000000_baseline.sql` | Full baseline (existing projects: mark applied, don’t re-run) |
| `20250104000000_repair_schema_drift.sql` | Estimate columns, lead/client link |
| `20250104010000_org_scoped_rls.sql` | Org-scoped RLS |
| `20250104020000_org_scoped_material_storage.sql` | Materials storage |
| `20250104030000_unify_team_membership.sql` | Team membership |
| `20250105000000_stripe_connect_payments.sql` | Connect + invoice checkout |
| `20250106000000_job_visits.sql` | Visits |
| `20250107000000_automation_jobs.sql` | Automation queue |
| `20250108000000_ai_quota_and_org_settings.sql` | AI quota RPC |
| `20250109000000_payment_and_invite_hardening.sql` | Payments + invites |
| `20250117000000_estimate_change_request_note.sql` | Change request note |
| `20250117100000_hub_messaging_thread.sql` | Hub messaging schema |
| `20250117110000_messages_realtime_replica.sql` | Realtime publication + replica identity |
| `20260819013314_contractor_inbox.sql` | Inbox RPC + `last_alert_at` |

```bash
npx supabase link --project-ref <ref>
# Existing project with baseline already live:
npx supabase migration repair --status applied 00000000000000
npx supabase db push
```

- [ ] All migrations applied on hosted project
- [ ] Local verify passed: `./scripts/verify-migrations.sh` (or green CI **migrations** job)
- [ ] Post-push smoke from `supabase/README.md`: payment, PDF, request→estimate, pipeline drag, client/lead dedup

### 2.2 Auth configuration (Dashboard → Authentication)

Redirect / site URLs must include:

- [ ] `https://<your-domain>/auth/callback`
- [ ] `https://<your-domain>/account-verified`
- [ ] `https://<your-domain>/reset-password`
- [ ] `https://<your-domain>/signup?oauth=continue` (OAuth signup resume after Google/Apple)
- [ ] Site URL = `NEXT_PUBLIC_APP_URL`

**Code paths:** `src/lib/auth-email-redirect.ts`, `src/app/account-verified/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/signup/signup-oauth-buttons.tsx`, `middleware.ts`

- [ ] Email confirmation enabled (signup flow expects verified email — `src/lib/supabase/middleware.ts` redirects unverified users to `/verify-email`)
- [ ] Custom SMTP or Supabase email templates branded for DyluxePro
- [ ] 2FA enabled on Supabase org account

#### Google & Apple OAuth (signup + login)

Enable in **Dashboard → Authentication → Providers**:

| Provider | Dashboard setup | Redirect URL |
|----------|-----------------|--------------|
| Google | OAuth client ID + secret from Google Cloud Console | `https://<your-domain>/auth/callback` |
| Apple | Services ID, Team ID, Key ID, `.p8` private key | same |

**Signup flow:** Step 1 OAuth → `/auth/callback?next=/signup?oauth=continue` → wizard steps 2–10 → `POST /api/auth/complete-signup` → `/account-verified`.

**Login flow:** OAuth → `/auth/callback?next=/dashboard`.

- [ ] Google provider enabled with correct redirect URLs (localhost + production)
- [ ] Apple provider configured (requires Apple Developer account)
- [ ] Smoke-test: Google signup completes org + onboarding settings
- [ ] Smoke-test: OAuth login for existing CRM user lands on dashboard

### 2.3 Realtime (Client Hub + CRM messaging)

Required for live messaging without full-page refresh:

- [ ] Table `messages` in publication `supabase_realtime` (migration `20250117110000_messages_realtime_replica.sql`)
- [ ] `REPLICA IDENTITY FULL` on `messages`
- [ ] Function `contractor_inbox` exists (migration `20260819013314_contractor_inbox.sql`)

**Code:** `src/hooks/use-conversation-messages.ts`, `src/lib/hub-messaging.ts` (`fetchContractorInbox`)

### 2.4 Backups & ops

- [ ] Pro plan or confirmed backup policy
- [ ] Service role key rotated if ever exposed
- [ ] RLS spot-check: run `supabase/tests/20-rls-behaviour.sql` logic manually if unsure

---

## 3. Resend (email)

| Step | Detail |
|------|--------|
| Domain | Add `dyluxepro.com` (or your domain) in Resend dashboard |
| DNS | SPF, DKIM, DMARC in Cloudflare/registrar |
| From address | Update `RESEND_FROM_EMAIL` — default is `DyluxePro <onboarding@resend.dev>` in `src/lib/email/resend-client.ts` |

### Email flows to smoke-test

| Flow | API / code |
|------|------------|
| Signup verification | Supabase Auth (not Resend) |
| Send estimate | `src/app/api/email/send-estimate/route.ts` → `src/lib/email/send-estimate-email.ts` |
| Send invoice | `src/app/api/email/send-invoice/route.ts` → `src/lib/email/send-invoice-email.ts` |
| Portal invite | `src/lib/email/send-portal-invite-email.ts` |
| Team invite | `src/lib/email/send-invite-email.ts` |
| Estimate approve/changes (client link) | `src/app/api/email/action/route.ts`, `src/lib/estimate-action-token.ts` |
| Message alert (Hub) | `src/lib/email/message-alert.ts` |
| Contact form | `src/app/api/contact/route.ts` → `CONTACT_EMAIL` |
| Automations | `src/lib/automations/executor.ts` |

- [ ] Domain verified in Resend
- [ ] `RESEND_FROM_EMAIL` uses your domain
- [ ] Each row above tested once on production

---

## 4. Stripe — SaaS subscriptions (you → contractors)

**Guide:** [STRIPE_SETUP_GUIDE.md](../STRIPE_SETUP_GUIDE.md)

### 4.1 Dashboard setup

- [ ] Stripe account fully activated (live mode)
- [ ] Products/prices created for Starter / Professional / Enterprise
- [ ] Price IDs copied into Vercel env (must match `src/lib/stripe-prices.ts` allowlist)
- [ ] **14-day trial** configured on Stripe prices if you honor “free trial” copy on `src/app/subscription/page.tsx`
- [ ] Customer portal enabled (used by `src/app/api/stripe/customer-portal/route.ts`)
- [ ] 2FA on Stripe account

### 4.2 Webhook

**Endpoint URL:** `https://<your-domain>/api/stripe/webhook`  
**Handler:** `src/app/api/stripe/webhook/route.ts`

Subscribe to these events (handler implements them):

| Event | Handler behavior |
|-------|------------------|
| `checkout.session.completed` | Subscription create OR Connect invoice payment (`recordStripeInvoicePayment`) |
| `customer.subscription.updated` | Update `subscriptions` row |
| `customer.subscription.deleted` | Update status |
| `invoice.payment_succeeded` | Refresh subscription period |
| `invoice.payment_failed` | Set status `past_due` |

- [ ] Webhook created in Stripe (live mode)
- [ ] `STRIPE_WEBHOOK_SECRET` matches endpoint
- [ ] Test event delivered successfully (Stripe dashboard → Send test webhook)

### 4.3 Checkout flow (code map)

| Step | File |
|------|------|
| Plans UI | `src/app/subscription/page.tsx` |
| Create session | `src/app/api/stripe/create-checkout/route.ts` |
| Seat quantity | `src/lib/stripe-seats.ts` |
| Success/cancel pages | `src/app/subscription/success`, `src/app/subscription/cancel` |
| Status API | `src/app/api/stripe/subscription-status/route.ts` |
| Settings billing UI | `src/app/settings/page.tsx` |

### 4.4 Subscription gate — code aligned (Stripe trial still required)

**Middleware:** `src/lib/supabase/middleware.ts`  
**Shared helper:** `src/lib/subscription-access.ts` (`active`, `trialing`, `past_due` + valid period)  
**Status API:** `src/app/api/stripe/subscription-status/route.ts` (same helper)

**Implemented (Option A):** CRM routes allow `active`, `trialing`, and `past_due` subscriptions — consistent with `src/lib/ai/quota.ts`.

**Still required from you:**

- [ ] Enable **14-day free trial** on each Stripe price (`NEXT_PUBLIC_STRIPE_PRICE_ID_*`) in Stripe Dashboard
- [ ] New signup → `/subscription` → Stripe Checkout → webhook creates `subscriptions.status = trialing` → `/dashboard` works
- [ ] Marketing copy (“No credit card required”) matches your Stripe trial setup (card required at checkout vs not)

Until checkout completes, new orgs without a subscription row are still redirected to `/subscription` (expected).

---

## 5. Stripe Connect (contractors → their clients)

| Step | File |
|------|------|
| Onboard link | `src/app/api/stripe/connect/onboard/route.ts` |
| Status | `src/app/api/stripe/connect/status/route.ts` |
| Invoice checkout | `src/app/api/invoices/[id]/checkout/route.ts` |
| Payment recording | `src/lib/stripe-invoice-payment.ts` |
| Settings UI | `src/app/settings/page.tsx` |

- [ ] Test org completes Connect onboarding
- [ ] Client pays invoice via hosted checkout
- [ ] Webhook `checkout.session.completed` with `metadata.type === 'invoice_payment'` updates payment row
- [ ] Understand payout timing and support responsibility

---

## 6. Vercel crons

Defined in `vercel.json`:

| Schedule (UTC) | Path | Auth | Purpose |
|----------------|------|------|---------|
| `0 6 * * *` | `/api/ai-estimates/cron/cleanup` | `CRON_SECRET` | AI temp storage cleanup |
| `0 8 * * *` | `/api/automations/cron/process` | `cron-auth.ts` | Run automation jobs |
| `0 7 * * *` | `/api/automations/cron/overdue` | same | Overdue invoice automations |
| `0 5 * * *` | `/api/visits/cron/extend` | same | Extend recurring visits |

- [ ] `CRON_SECRET` set in Vercel (Vercel sends `Authorization: Bearer <CRON_SECRET>` when configured)
- [ ] After deploy, check Vercel → Cron logs for 200 responses
- [ ] Requires **Vercel Pro** (or equivalent) for cron execution

---

## 7. Rate limiting

**Implementation:** `src/lib/rate-limit.ts`

| Limiter key | Typical use |
|-------------|-------------|
| `signup` | `src/app/api/auth/signup/route.ts` |
| `complete-signup` | `src/app/api/auth/complete-signup/route.ts` |
| `contact` | `src/app/api/contact/route.ts` |
| `ai-estimate` | `src/app/api/ai-estimates/analyze/route.ts` |
| `email-send` | Estimate/invoice send routes |
| `email-action` | Client estimate actions |
| `public-strict` | Public estimate lookup |

- [ ] Upstash configured in production
- [ ] Intentional 429 on repeated signup/contact attempts

---

## 8. Security checklist

- [ ] Rotate all secrets if app was ever on compromised Next.js or keys leaked
- [ ] 2FA: Vercel, Supabase, Stripe, Resend, Cloudflare
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] Stripe webhook signature verification enabled (default in webhook route)
- [ ] Account deletion works: `DELETE /api/user/delete-account` (`src/app/api/user/delete-account/route.ts`)
- [ ] Org data export works: Settings → export JSON (`src/app/settings/page.tsx`)

---

## 9. Legal & business (non-code)

| Item | Repo status |
|------|-------------|
| Privacy policy | `src/app/privacy/page.tsx` — `/privacy` |
| Terms of service | `src/app/terms/page.tsx` — `/terms` |
| Signup consent links | `src/app/signup/page.tsx`, `src/app/client-register/page.tsx` |
| Cookie banner (EU) | Not implemented |
| Refund/cancellation policy | Partially in Terms §3 |
| Business entity + bank | External |
| Support inbox | Set `CONTACT_EMAIL` |

- [ ] Lawyer review of Privacy + Terms (recommended before paid marketing)
- [ ] Refund policy documented and matches Stripe portal behavior
- [ ] Cookie consent if targeting EU/UK/CA

---

## 10. Production smoke test (run in order)

Do this on **production** with a throwaway account.

### 10.1 Contractor (CRM)

#### Signup wizard (email + OAuth)

1. [ ] `/signup?ref=YOURCODE` → instant Google — steps 2–10, org + affiliate referral in DB
2. [ ] Email signup — all 10 steps → `/signup/confirm` → verify email
3. [ ] Refresh on step 7 (OAuth path) — same step, answers preserved
4. [ ] Login → Google (existing CRM user) → `/dashboard`
5. [ ] Login → Google (brand-new user) → `/signup?oauth=continue` step 2+
6. [ ] Mobile viewport — no overflow; progress bar + footer usable

#### Core CRM

7. [ ] `/` → `/signup` — create org
8. [ ] Verify email → `/account-verified` → dashboard or subscription
9. [ ] `/subscription` — complete Stripe checkout (trial creates `trialing` status)
10. [ ] `/dashboard` — loads pipeline (trialing user not blocked)
11. [ ] `/clients/new` — create client
12. [ ] `/estimates/new` — create + `/api/email/send-estimate`
13. [ ] `/jobs` — schedule job
14. [ ] `/invoices/new` — invoice from estimate
15. [ ] `/messages` — send message; second browser/tab receives without full refresh
16. [ ] `/team` — invite member; worker login sees assigned work only
17. [ ] `/settings` — Connect onboarding (if using client payments)
18. [ ] Settings → export data (JSON download)
19. [ ] Settings → delete account — confirm auth user removed

### 10.2 Client (Hub)

1. [ ] Portal invite email received
2. [ ] `/portal/register` or invite link — client account
3. [ ] `/portal` — dashboard
4. [ ] `/portal/messages` — reply to contractor
5. [ ] Approve/request changes on estimate (email link → `/estimate-action`)

### 10.3 Public

1. [ ] `/contact` — message delivered to `CONTACT_EMAIL`
2. [ ] `/request/<org-slug>` — service request (if enabled for org)

---

## 11. Monitoring after launch

| Tool | Setup |
|------|--------|
| Sentry | DSN in Vercel; watch `src/lib/api-error.ts` captures |
| Vercel | Deployment + function logs |
| Supabase | Database logs, Auth logs |
| Resend | Delivery/bounce dashboard |
| Stripe | Failed payments, webhook delivery log |
| Uptime | External ping (Better Stack, UptimeRobot) — **not in repo** |

- [ ] Sentry alert on new issues
- [ ] Daily check: Stripe failed payments + webhook failures (first 2 weeks)

---

## 12. Known gaps (not launch blockers, set expectations)

| Feature | Status |
|---------|--------|
| Materials / HD–Lowe’s catalog | Not integrated |
| Affiliate payouts | Tracking only; no automated payout rail |
| SMS automations | Requires Twilio env |
| Help center / docs site | Tutorial tour only (`src/components/tutorial/`) |
| Native iOS/Android apps | Web only |
| Product analytics | Not integrated |
| ESLint warnings (~300) | CI passes; cleanup optional |

---

## 13. Suggested launch sequence

**Week 1 — Technical**

- [ ] §1 Vercel env vars
- [ ] §2 Supabase migrations + Auth URLs
- [ ] §3 Resend domain
- [ ] §4–5 Stripe live + webhook + Connect test
- [ ] §6 Crons + §7 Rate limits
- [ ] §4.4 Stripe trial on prices + smoke-test trialing → dashboard
- [ ] §10 Full smoke test

**Week 2 — Trust**

- [ ] §9 Legal review light pass
- [ ] §8 Secret rotation if needed
- [ ] §11 Monitoring alerts

**Week 3 — Soft launch**

- [ ] 5–10 beta contractors
- [ ] Fix bugs from real usage
- [ ] Align pricing copy with actual limits (`src/lib/ai/quota.ts` tiers)

**Week 4 — Public**

- [ ] Marketing / SEO on `src/app/page.tsx`
- [ ] CI green on every push to `main`

---

## Quick command reference

```bash
# Local quality gate (same as CI build job)
npm run lint && npm run test && npm run build

# Migrations (needs Postgres 16 locally)
./scripts/verify-migrations.sh

# Push schema to hosted Supabase
npx supabase link --project-ref <ref>
npx supabase db push
```

---

*Last updated: August 2026 — regenerate sections when adding migrations or env vars.*
