# AI Estimate — setup notes

This document covers the manual steps required to enable the AI Estimate
feature in production. All code changes are already in place; what's
listed here can only be done from outside the repo.

## 1. Environment variables (Vercel + `.env.local`)

Add the following to **Settings → Environment Variables** in Vercel for
Production, Preview, and Development. Mirror them in `.env.local` for
local dev.

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | A regular OpenAI project key with access to `gpt-4o` and `gpt-4o-mini`. |
| `OPENAI_VISION_MODEL` | No | Defaults to `gpt-4o`. Swap to `gpt-4o-mini` for cheaper but lower-quality detection. |
| `OPENAI_PRICING_MODEL` | No | Defaults to `gpt-4o-mini`. Used for the batched price-suggestion call only. |
| `CRON_SECRET` | Recommended | Random 32-char string. Used to gate the nightly cleanup cron from outside Vercel. Vercel-stamped cron calls bypass it automatically. |

The existing `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER` /
`NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL` /
`NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE` vars are reused by
[`src/lib/ai/quota.ts`](src/lib/ai/quota.ts) to map a user's Stripe
price ID to a plan tier (Starter / Pro / Enterprise) and therefore to
their monthly cap.

### Cost expectations

| Plan | Cap / month | Worst-case monthly cost per user |
|------|-------------|----------------------------------|
| Starter | 5 | ~$0.10 |
| Pro | 100 | ~$2.00 |
| Enterprise | Unlimited | bounded by per-minute rate limit (10/min/user) |

Numbers assume GPT-4o at ~$0.02/call (3-5 photos, single response).

## 2. Supabase schema

Run [`supabase-ai-estimates-schema.sql`](supabase-ai-estimates-schema.sql)
in the Supabase SQL Editor. It creates:

- `public.ai_estimate_sessions` — one row per photo-to-estimate session.
- `public.ai_estimate_usage` — per-user, per-month counter for quota enforcement.

Both tables have RLS enabled with per-user policies.

## 3. Supabase Storage bucket

The SQL migration cannot create buckets, so this one is manual:

1. **Supabase Dashboard → Storage → New bucket**
   - Name: `ai-estimates`
   - Public: **OFF** (private)
2. **Storage → Policies → ai-estimates** — create three policies:

   ```sql
   -- SELECT
   CREATE POLICY "ai_estimates_read_own"
     ON storage.objects FOR SELECT
     USING (
       bucket_id = 'ai-estimates'
       AND auth.uid()::text = (storage.foldername(name))[1]
     );

   -- INSERT
   CREATE POLICY "ai_estimates_insert_own"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'ai-estimates'
       AND auth.uid()::text = (storage.foldername(name))[1]
     );

   -- DELETE (used by the cleanup cron and by the wizard's "remove" button)
   CREATE POLICY "ai_estimates_delete_own"
     ON storage.objects FOR DELETE
     USING (
       bucket_id = 'ai-estimates'
       AND auth.uid()::text = (storage.foldername(name))[1]
     );
   ```

The pipeline uploads photos under
`{user.id}/{session_id}/photo-N.{ext}`, which is why the policies key
off `(storage.foldername(name))[1]`.

## 4. Vercel cron job

[`vercel.json`](vercel.json) registers a single nightly cron that hits
[`/api/ai-estimates/cron/cleanup`](src/app/api/ai-estimates/cron/cleanup/route.ts).
Vercel automatically picks this up on the next deploy. The cron deletes
photos belonging to sessions older than 90 days that never converted to
a real estimate. The session rows themselves are kept (tiny) so usage
analytics remain queryable.

## 5. Optional: sample photo

The wizard's empty state offers a "Try with a sample photo" link that
fetches `/sample-ai-estimate.jpg`. Drop a curated JPEG at
`public/sample-ai-estimate.jpg` (for example: a tidy photo of a small
pile of plumbing or electrical fittings) so first-time users have a
one-click way to experience the wow moment. The link silently
no-ops if the file is missing.

## 6. Smoke test checklist

Once everything above is wired:

- [ ] Sign in as a user with an active Pro subscription.
- [ ] Visit `/estimates/new/ai` on mobile (Safari iOS and Chrome Android).
- [ ] Step 1 — take a photo with the camera button. Confirm thumbnail appears.
- [ ] Step 2 — fill in trade, hours, rate, markup. Tap "Analyze with AI".
- [ ] Confirm the loading spinner runs for 5-30 seconds, no errors.
- [ ] Step 3 — verify line items appear with green ("From your catalog")
      and amber ("AI suggested") badges. Edit qty + price. Verify total
      recomputes.
- [ ] Step 4 — pick a client, hit "Save & send". Confirm redirect to
      `/estimates/{id}?from_ai=1` and that the standard estimate detail
      page renders.
- [ ] Visit `/settings` — verify the AI Usage widget shows `1/100` (or
      whatever the new count is).
- [ ] Try exceeding the Starter cap (set the test user to Starter, run
      6 AI estimates). Confirm a 429 with an upgrade prompt.

## 7. Known follow-ups (intentionally out of v1 scope)

- Web-search pricing API (Brave/Tavily/SerpAPI) layered behind catalog matching.
- Voice-note context input via Whisper transcription.
- Proper analytics layer (Posthog/Segment/Plausible) replacing the
  `console.info("[ai-estimate] converted", …)` placeholder.
- Vitest + a real test suite for `vision.ts`, `catalog-match.ts`, and
  `quota.ts`. Today these modules have no automated coverage.
