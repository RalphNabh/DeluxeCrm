-- =============================================================================
-- Phase 2: Stripe Connect + online invoice payments
-- =============================================================================
-- Contractors onboard Express connected accounts; clients pay invoices via
-- Checkout Sessions with destination charges. Manual cash/check payments remain.
-- =============================================================================

alter table public.organizations
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_details_submitted boolean not null default false;

create unique index if not exists idx_organizations_stripe_connect_account
  on public.organizations (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

comment on column public.organizations.stripe_connect_account_id is
  'Stripe Express connected account id (acct_...) for client invoice payments';

alter table public.payments
  add column if not exists source text not null default 'manual',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

alter table public.payments
  drop constraint if exists payments_source_check;

alter table public.payments
  add constraint payments_source_check
  check (source in ('manual', 'stripe'));

create unique index if not exists idx_payments_stripe_checkout_session
  on public.payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists idx_payments_stripe_payment_intent
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

comment on column public.payments.source is
  'manual = contractor-logged; stripe = online Checkout payment';
