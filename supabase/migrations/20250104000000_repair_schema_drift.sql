-- =============================================================================
-- Repair schema/code drift
-- =============================================================================
-- Each change below fixes a place where the application already reads or writes
-- something the schema does not support.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- estimates: columns the application already reads
-- -----------------------------------------------------------------------------
-- send-estimate-email.ts writes sent_at; the portal dashboard selects
-- estimate_number and valid_until. None of the three existed, so the write was
-- silently dropped and the portal rendered undefined.
alter table public.estimates
  add column if not exists sent_at timestamptz,
  add column if not exists estimate_number text,
  add column if not exists valid_until date;

-- Number pre-existing estimates so the portal has something to show. Sequential
-- per organization, matching how a contractor would have numbered them.
with numbered as (
  select
    id,
    'EST-' || lpad(
      row_number() over (
        partition by coalesce(organization_id::text, user_id::text)
        order by created_at, id
      )::text,
      6,
      '0'
    ) as generated_number
  from public.estimates
  where estimate_number is null
)
update public.estimates e
set estimate_number = numbered.generated_number
from numbered
where e.id = numbered.id;

-- Quotes expire 30 days out, which is what the estimate email has always
-- claimed in its copy without anything enforcing it.
update public.estimates
set valid_until = (coalesce(sent_at, created_at) + interval '30 days')::date
where valid_until is null;

create unique index if not exists idx_estimates_number_per_org
  on public.estimates (coalesce(organization_id::text, user_id::text), estimate_number);

create index if not exists idx_estimates_valid_until on public.estimates (valid_until);

-- -----------------------------------------------------------------------------
-- estimates.status: allow the value the client-facing action writes
-- -----------------------------------------------------------------------------
-- /api/email/action sets 'Changes Requested' when a client requests changes.
-- The CHECK constraint rejected it, so that request failed at the database.
alter table public.estimates drop constraint if exists estimates_status_check;
alter table public.estimates add constraint estimates_status_check
  check (status in (
    'Draft', 'Sent', 'Approved', 'Rejected',
    'Changes Requested', 'Scheduled', 'Completed'
  ));

-- -----------------------------------------------------------------------------
-- leads.status: stop contradicting customizable pipeline stages
-- -----------------------------------------------------------------------------
-- pipeline_stages lets a user name a stage anything, and the dashboard writes
-- that name to leads.status. The CHECK constraint pinned it to five built-in
-- names, so dragging a lead into a custom stage failed. The API validates a
-- status change against the org's pipeline_stages rows before writing.
alter table public.leads drop constraint if exists leads_status_check;

create index if not exists idx_leads_status on public.leads (status);

-- -----------------------------------------------------------------------------
-- leads.client_id: link a pipeline card to its client explicitly
-- -----------------------------------------------------------------------------
-- The dashboard matched leads to clients by comparing email, then name. That
-- guess is also why saving a client created a second pipeline card for someone
-- already in the pipeline. Record the relationship instead of inferring it.
alter table public.leads
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists idx_leads_client_id on public.leads (client_id);

-- Backfill using the same email-then-name matching the dashboard used, so
-- existing pipelines keep working. Ties are broken by oldest client.
with matched as (
  select distinct on (l.id) l.id as lead_id, c.id as client_id
  from public.leads l
  join public.clients c
    on c.organization_id is not distinct from l.organization_id
   and (
     (nullif(lower(trim(l.email)), '') is not null
       and lower(trim(l.email)) = lower(trim(c.email)))
     or (nullif(lower(trim(l.name)), '') is not null
       and lower(trim(l.name)) = lower(trim(c.name)))
   )
  where l.client_id is null
  order by l.id,
    (lower(trim(l.email)) = lower(trim(c.email))) desc nulls last,
    c.created_at
)
update public.leads l
set client_id = matched.client_id
from matched
where l.id = matched.lead_id;

comment on column public.leads.client_id is
  'Client this pipeline card represents, once the lead has been converted';

-- -----------------------------------------------------------------------------
-- payments: index the org column the API filters on
-- -----------------------------------------------------------------------------
create index if not exists idx_payments_organization_id
  on public.payments (organization_id);

comment on column public.estimates.sent_at is
  'When the estimate was emailed to the client';
comment on column public.estimates.estimate_number is
  'Human-facing quote number, unique per organization';
comment on column public.estimates.valid_until is
  'Date the quote expires; surfaced to the client';
