-- Per-row idempotency guard for the new-lead alert email (not a time-window
-- throttle like conversations.last_alert_at — each service_requests row is
-- one discrete lead, so every lead should get its own email; this just
-- prevents a double-send if a route were ever invoked twice for one row.
alter table public.service_requests
  add column if not exists lead_alert_sent_at timestamptz;
