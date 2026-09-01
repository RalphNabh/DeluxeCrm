-- Supports the calendar's quick-create popover: an "Anytime" job has no
-- specific time slot (still stores a full-day start/end since both columns
-- are not-null - is_anytime is what the calendar actually branches on), and
-- jobs can carry line items the same way invoices already do.
alter table public.jobs
  add column if not exists is_anytime boolean not null default false;

create table if not exists public.job_line_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit text not null default 'ea',
  unit_price numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.job_line_items enable row level security;

drop policy if exists "org members access job_line_items" on public.job_line_items;

-- Mirrors the existing job-child-table policy pattern (job_assignments,
-- job_equipment, ...): visibility delegates to the parent job's org, since
-- this table has no organization_id of its own.
create policy "org members access job_line_items" on public.job_line_items
  for all using (
    exists (
      select 1 from public.jobs j
      where j.id = job_line_items.job_id
        and (
          public.is_org_member(j.organization_id)
          or (j.organization_id is null and j.user_id = auth.uid())
        )
    )
  );
