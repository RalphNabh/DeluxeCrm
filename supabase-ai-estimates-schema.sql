-- AI Estimates Schema
-- Run this SQL in your Supabase SQL Editor to enable the AI Estimate feature.
--
-- Creates two tables:
--   1. ai_estimate_sessions  - one row per AI photo-to-estimate session.
--      Tracks photos, contractor context, detected items, and the final
--      estimate it was converted to (if any).
--   2. ai_estimate_usage     - monthly per-user counter used to enforce
--      plan quotas (Starter 5/mo, Pro 100/mo, Enterprise unlimited).
--
-- Also creates a private Supabase Storage bucket `ai-estimates` (must be
-- created from the Storage UI or via the Storage admin API — bucket creation
-- is not possible from SQL).

----------------------------------------------------------------------------
-- 1. ai_estimate_sessions
----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_estimate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lifecycle: analyzing -> ready -> converted, or -> abandoned (cron cleanup)
  status text NOT NULL DEFAULT 'analyzing'
    CHECK (status IN ('analyzing', 'ready', 'converted', 'abandoned', 'error')),

  -- Storage URLs (signed or path-encoded) for the uploaded contractor photos.
  photo_urls text[] NOT NULL DEFAULT '{}',

  -- Contractor-provided context for the AI: trade, sqft, labor, markup, notes.
  -- Free-form jsonb so we can evolve the shape without migrations.
  context jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Output of the vision + catalog-match pipeline. Array of EnrichedLineItem.
  detected_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Error envelope when status='error' (provider, code, message). Null otherwise.
  error jsonb,

  -- Set when the session is finalized into a real estimate.
  final_estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_estimate_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_estimate_sessions_select_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_insert_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_update_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_delete_own" ON public.ai_estimate_sessions;

CREATE POLICY "ai_estimate_sessions_select_own"
  ON public.ai_estimate_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_estimate_sessions_insert_own"
  ON public.ai_estimate_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_estimate_sessions_update_own"
  ON public.ai_estimate_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ai_estimate_sessions_delete_own"
  ON public.ai_estimate_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_user_id
  ON public.ai_estimate_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_status_created_at
  ON public.ai_estimate_sessions(status, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_final_estimate_id
  ON public.ai_estimate_sessions(final_estimate_id)
  WHERE final_estimate_id IS NOT NULL;

DROP TRIGGER IF EXISTS handle_ai_estimate_sessions_updated_at
  ON public.ai_estimate_sessions;

CREATE TRIGGER handle_ai_estimate_sessions_updated_at
  BEFORE UPDATE ON public.ai_estimate_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

COMMENT ON TABLE public.ai_estimate_sessions IS
  'One row per AI photo-to-estimate session. Tracks photos, contractor context, vision output, and the final estimate it was converted to (if any).';
COMMENT ON COLUMN public.ai_estimate_sessions.status IS
  'Lifecycle: analyzing -> ready -> converted, or -> abandoned (90-day cron cleanup), or -> error.';
COMMENT ON COLUMN public.ai_estimate_sessions.context IS
  'Contractor-supplied context: { trade, sqft, labor_hours, labor_rate, markup_pct, notes, client_id, lead_id }.';
COMMENT ON COLUMN public.ai_estimate_sessions.detected_items IS
  'Enriched line items returned by the vision + catalog-match pipeline.';

----------------------------------------------------------------------------
-- 2. ai_estimate_usage
----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_estimate_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- e.g. '2026-05'. Quotas reset on the 1st of each calendar month (UTC).
  year_month text NOT NULL,

  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, year_month)
);

ALTER TABLE public.ai_estimate_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_estimate_usage_select_own" ON public.ai_estimate_usage;
DROP POLICY IF EXISTS "ai_estimate_usage_insert_own" ON public.ai_estimate_usage;
DROP POLICY IF EXISTS "ai_estimate_usage_update_own" ON public.ai_estimate_usage;

CREATE POLICY "ai_estimate_usage_select_own"
  ON public.ai_estimate_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates only happen via the service-role server route, but we still
-- want the policy in place so RLS is not silently bypassable from clients.
CREATE POLICY "ai_estimate_usage_insert_own"
  ON public.ai_estimate_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_estimate_usage_update_own"
  ON public.ai_estimate_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_usage_user_year_month
  ON public.ai_estimate_usage(user_id, year_month);

COMMENT ON TABLE public.ai_estimate_usage IS
  'Monthly per-user counter of AI estimate sessions, used to enforce plan quotas.';
COMMENT ON COLUMN public.ai_estimate_usage.year_month IS
  'Calendar month in YYYY-MM format (UTC). Quotas reset on the 1st each month.';

----------------------------------------------------------------------------
-- 3. Storage bucket reminder
----------------------------------------------------------------------------
--
-- Create a PRIVATE bucket named `ai-estimates` from Supabase Dashboard
-- (Storage -> New bucket -> name: ai-estimates, public: OFF).
--
-- Then apply these storage RLS policies in Supabase Storage > Policies for
-- the bucket so that each user can only access photos under their own UUID
-- prefix:
--
--   -- SELECT
--   CREATE POLICY "ai_estimates_read_own"
--     ON storage.objects FOR SELECT
--     USING (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   -- INSERT
--   CREATE POLICY "ai_estimates_insert_own"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   -- DELETE (used by the abandoned-photo cleanup cron and by the user via
--   -- the wizard's "remove photo" button)
--   CREATE POLICY "ai_estimates_delete_own"
--     ON storage.objects FOR DELETE
--     USING (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
