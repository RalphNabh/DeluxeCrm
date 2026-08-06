-- =============================================================================
-- Phase 4: Recurring jobs / visits
-- =============================================================================
-- Jobber-style model: one job can have many visits. Calendar atom going forward
-- is visits. Recurrence rules live on jobs; visits are materialized occurrences.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Recurrence fields on jobs
-- -----------------------------------------------------------------------------
alter table public.jobs
  add column if not exists recurrence_freq text,
  add column if not exists recurrence_interval integer not null default 1,
  add column if not exists recurrence_byweekday text[],
  add column if not exists recurrence_until date,
  add column if not exists recurrence_count integer,
  add column if not exists timezone text;

alter table public.jobs
  drop constraint if exists jobs_recurrence_freq_check;

alter table public.jobs
  add constraint jobs_recurrence_freq_check
  check (
    recurrence_freq is null
    or recurrence_freq in ('daily', 'weekly', 'monthly')
  );

alter table public.jobs
  drop constraint if exists jobs_recurrence_interval_check;

alter table public.jobs
  add constraint jobs_recurrence_interval_check
  check (recurrence_interval >= 1);

alter table public.jobs
  drop constraint if exists jobs_recurrence_count_check;

alter table public.jobs
  add constraint jobs_recurrence_count_check
  check (recurrence_count is null or recurrence_count >= 1);

comment on column public.jobs.recurrence_freq is
  'null = one-off job; daily|weekly|monthly for recurring series';
comment on column public.jobs.recurrence_interval is
  'Every N units of recurrence_freq (default 1)';
comment on column public.jobs.recurrence_byweekday is
  'Weekday codes for weekly rules: SU,MO,TU,WE,TH,FR,SA';
comment on column public.jobs.recurrence_until is
  'Inclusive end date for the recurrence series';
comment on column public.jobs.recurrence_count is
  'Optional max occurrence count (alternative to until)';
comment on column public.jobs.timezone is
  'IANA timezone used when materializing visit times';

-- -----------------------------------------------------------------------------
-- visits table
-- -----------------------------------------------------------------------------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'skipped', 'cancelled')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent materialization: one visit per job occurrence start
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'visits_job_scheduled_start_key'
  ) then
    alter table public.visits
      add constraint visits_job_scheduled_start_key unique (job_id, scheduled_start);
  end if;
end $$;

create index if not exists idx_visits_org_scheduled_start
  on public.visits (organization_id, scheduled_start);

create index if not exists idx_visits_job_id
  on public.visits (job_id);

comment on table public.visits is
  'Materialized visit occurrences for one-off and recurring jobs; calendar atom';

-- -----------------------------------------------------------------------------
-- updated_at trigger (match other tenant tables when helper exists)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    drop trigger if exists set_visits_updated_at on public.visits;
    create trigger set_visits_updated_at
      before update on public.visits
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RLS: org-scoped like jobs (managers all; workers via job assignment)
-- -----------------------------------------------------------------------------
alter table public.visits enable row level security;

do $$
declare
  existing record;
begin
  for existing in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'visits'
  loop
    execute format('drop policy if exists %I on public.visits', existing.policyname);
  end loop;
end $$;

create policy "org members read visits" on public.visits
  for select using (
    public.is_org_member(organization_id)
    and (
      public.is_org_manager_or_above(organization_id)
      or public.user_is_assigned_to_job(job_id)
    )
  );

create policy "org managers insert visits" on public.visits
  for insert with check (
    public.is_org_manager_or_above(organization_id)
  );

-- Field workers complete/skip/reschedule their assigned visits
create policy "org members update visits" on public.visits
  for update using (
    public.is_org_member(organization_id)
    and (
      public.is_org_manager_or_above(organization_id)
      or public.user_is_assigned_to_job(job_id)
    )
  );

create policy "org managers delete visits" on public.visits
  for delete using (
    public.is_org_manager_or_above(organization_id)
  );

-- -----------------------------------------------------------------------------
-- Backfill: one visit per existing job that has a start_time
-- -----------------------------------------------------------------------------
insert into public.visits (
  organization_id,
  job_id,
  scheduled_start,
  scheduled_end,
  status,
  completed_at,
  notes,
  created_at,
  updated_at
)
select
  j.organization_id,
  j.id,
  j.start_time,
  j.end_time,
  case
    when lower(j.status) = 'completed' then 'completed'
    when lower(j.status) = 'cancelled' then 'cancelled'
    else 'scheduled'
  end,
  case when lower(j.status) = 'completed' then coalesce(j.updated_at, now()) else null end,
  null,
  coalesce(j.created_at, now()),
  now()
from public.jobs j
where j.organization_id is not null
  and j.start_time is not null
  and j.end_time is not null
on conflict (job_id, scheduled_start) do nothing;
