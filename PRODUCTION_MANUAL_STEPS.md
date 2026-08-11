# Manual steps after production hardening deploy

Schema changes live in `supabase/migrations/` and are applied with the Supabase CLI
(see `supabase/README.md`). Do **not** paste root-level `.sql` files — those were
removed when the baseline migration was adopted.

## Existing production database

If the project already contains the hand-applied schema that became the baseline:

```bash
npx supabase link --project-ref <ref>
npx supabase migration repair --status applied 00000000000000
npx supabase db push
```

`db push` then applies drift repair and later migrations. If the old world-readable
automations policy is still present, drop it:

```sql
drop policy if exists "Enable read automations for executor" on public.automations;
```



## Smoke checklist (after push)

1. Record a payment on an invoice — balance updates
2. Open an invoice with `?download=true` — PDF downloads
3. Convert a service request to an estimate — real client, line item, `converted_estimate_id`
4. Drag a lead onto a custom pipeline stage — status saves
5. Create a client that already matches a lead — no second pipeline card; `leads.client_id` set



## Vercel environment variables (add if missing)


| Variable                                                  | Purpose                                                                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ESTIMATE_ACTION_SECRET`                                  | Signs client estimate approve links (or reuses `CRON_SECRET`)              |
| `CRON_SECRET`                                             | Protects cron + Vercel auto-injects on scheduled jobs                      |
| `RESEND_FROM_EMAIL`                                       | Automation / transactional From address (falls back to Resend test domain) |
| `TWILIO_ACCOUNT_SID`                                      | Optional — required for `send_sms` automations                             |
| `TWILIO_AUTH_TOKEN`                                       | Optional — Twilio auth                                                     |
| `TWILIO_FROM_NUMBER`                                      | Optional — E.164 sender (e.g. `+15551234567`)                              |
| `UPSTASH_REDIS_REST_URL` / `TOKEN`                        | Required in production (rate limits fail closed without them)              |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Contact form captcha                                                       |
| `NEXT_PUBLIC_APP_URL`                                     | `https://www.dyluxepro.com`                                                |




### Automations / SMS notes

- Org SMS preference is stored in `organizations.settings.sms_notifications` (Settings UI → PATCH `/api/org/settings`). localStorage does **not** control SMS sends.
- Crons accept `Authorization: Bearer $CRON_SECRET` or `?secret=`.
- Schedules in `vercel.json` today:
  - `/api/automations/cron/process` — **once daily** `0 8 * * *` (08:00 UTC)
  - `/api/automations/cron/overdue` — daily `0 7 * * *`
  - `/api/visits/cron/extend` — daily `0 5 * * *`
  - `/api/ai-estimates/cron/cleanup` — daily `0 6 * * *`
- Apply migration `20250107000000_automation_jobs` before relying on delayed sends or overdue scans.

#### TODO: restore frequent process cron (Hobby limitation)

Vercel **Hobby** only allows cron jobs that run at most **once per day**. The product intent for delayed automations is **every 15 minutes** (`*/15 * * * *`). That expression **blocks deploys** on Hobby.

**Current workaround:** process runs daily so production can deploy.

**When delayed email/SMS latency matters, do one of:**
1. Upgrade to **Vercel Pro** and set process back to `*/15 * * * *` in `vercel.json`, or
2. Keep Hobby; call `/api/automations/cron/process` every 15m from an external scheduler (e.g. cron-job.org) with `CRON_SECRET`; leave Vercel’s process entry daily or remove it.



## Supabase Auth

Add redirect URL: `https://www.dyluxepro.com/reset-password` for password reset emails.

## Re-send estimate emails

Old approve links without `token` will not work. Re-send estimates after deploy so clients get signed links.

## Stripe (after billing code deploy)

Webhook handler uses Stripe API `2025-11-17.clover` and reads billing periods from subscription line items. Test checkout → webhook → subscription row in Supabase after deploy.