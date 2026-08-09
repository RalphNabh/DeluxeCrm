-- =============================================================================
-- Phase 5: Automation job queue + invoice overdue dedupe
-- =============================================================================
-- Delayed automations enqueue rows in automation_jobs; cron processes due jobs.
-- invoices.overdue_notified_at prevents duplicate invoice_overdue emissions.
-- =============================================================================

create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  run_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_automation_jobs_dedupe_key
  on public.automation_jobs (dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_automation_jobs_due
  on public.automation_jobs (status, run_at)
  where status = 'pending';

create index if not exists idx_automation_jobs_organization_id
  on public.automation_jobs (organization_id);

drop trigger if exists automation_jobs_updated_at on public.automation_jobs;
create trigger automation_jobs_updated_at
before update on public.automation_jobs
for each row execute function public.handle_updated_at();

alter table public.automation_jobs enable row level security;

-- Service role bypasses RLS; managers can inspect their org's queue.
drop policy if exists "Managers can select automation jobs" on public.automation_jobs;
create policy "Managers can select automation jobs"
  on public.automation_jobs
  for select
  using (public.is_org_manager_or_above(organization_id));

comment on table public.automation_jobs is
  'Deferred automation executions; processed by /api/automations/cron/process';

alter table public.invoices
  add column if not exists overdue_notified_at timestamptz;

create index if not exists idx_invoices_overdue_scan
  on public.invoices (due_date, status)
  where overdue_notified_at is null;

comment on column public.invoices.overdue_notified_at is
  'Set when invoice_overdue automation was emitted; prevents duplicate cron notifications';
