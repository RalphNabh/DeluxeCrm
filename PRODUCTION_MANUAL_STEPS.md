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

## Stripe (after billing code deploy)

Webhook handler uses Stripe API `2025-11-17.clover` and reads billing periods from subscription line items. Test checkout → webhook → subscription row in Supabase after deploy.
