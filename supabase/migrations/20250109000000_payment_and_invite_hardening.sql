-- =============================================================================
-- Critical/High hardening: webhook claim status, checkout locks, invite RLS
-- =============================================================================

-- Ensure webhook idempotency table exists (may be missing on pre-baseline DBs).
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- Webhook idempotency: seen ≠ done
alter table public.stripe_webhook_events
  add column if not exists status text not null default 'received',
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;

alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
  check (status in ('received', 'processing', 'processed', 'failed'));

update public.stripe_webhook_events
set status = 'processed'
where status = 'received';

comment on column public.stripe_webhook_events.status is
  'received/processing/processed/failed — only processed is a durable ack';

-- Invoice Checkout session lock (refresh / double-click safe)
alter table public.invoices
  add column if not exists pending_checkout_session_id text,
  add column if not exists pending_checkout_amount numeric,
  add column if not exists pending_checkout_created_at timestamptz;

comment on column public.invoices.pending_checkout_session_id is
  'Open Stripe Checkout session for the remaining balance; reused until paid/expired';

-- Invitation tokens must not be world-readable
drop policy if exists "Anyone can read invitation by token" on public.organization_invitations;
