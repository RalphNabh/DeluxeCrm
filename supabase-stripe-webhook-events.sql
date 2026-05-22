-- Idempotency table for Stripe webhooks (run once in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (webhook handler) should access this table.
