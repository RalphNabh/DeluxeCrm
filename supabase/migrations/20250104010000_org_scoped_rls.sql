-- =============================================================================
-- Finish org-scoped row level security
-- =============================================================================
-- The baseline applied org policies to `clients` only, with a comment saying to
-- repeat the pattern for the other tenant tables. That never happened, so every
-- other table still required `auth.uid() = user_id`. The API layer filters by
-- organization_id and looks multi-tenant, but Postgres handed a teammate an
-- empty list for estimates, invoices, jobs, leads and everything else. Inviting
-- someone produced an empty app.
--
-- This migration replaces the owner-only policies with org-scoped ones.
--
-- Rows whose organization_id could not be backfilled (an account with no
-- membership) stay reachable by their creator through an explicit legacy
-- fallback, so no existing data becomes invisible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Assignment lookups, as SECURITY DEFINER helpers
-- -----------------------------------------------------------------------------
-- The jobs policy needs to know whether the caller is assigned to the job, and
-- the job_assignments policy needs to know whether the caller can see the job.
-- Expressed directly against each other they recurse ("infinite recursion
-- detected in policy for relation jobs"). SECURITY DEFINER breaks the cycle by
-- reading the assignment table without invoking its policy — the same technique
-- the baseline used for organization_members.
create or replace function public.user_is_assigned_to_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.job_assignments
    where job_id = p_job_id and user_id = auth.uid()
  );
$$;

create or replace function public.user_is_assigned_to_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.client_assignments
    where client_id = p_client_id and member_user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Re-run the backfill in case rows were created before organization_id existed
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'tasks', 'materials', 'pipeline_stages', 'client_folders',
    'automations', 'automation_runs'
  ];
begin
  foreach t in array tenant_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format(
        'update public.%I tbl
            set organization_id = om.org_id
           from public.organization_members om
          where om.user_id = tbl.user_id
            and om.status = ''active''
            and tbl.organization_id is null',
        t
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Uniform tenant tables
-- -----------------------------------------------------------------------------
-- read/write levels:
--   member  - anyone in the organization
--   manager - owner, admin or manager (see public.is_org_manager_or_above)
--
-- Financial and sales records are manager-and-above, matching the RBAC matrix
-- in src/lib/rbac.ts, where a worker has neither create_estimates nor
-- create_invoices nor any client-list permission beyond assigned clients.
-- Reference data a worker legitimately needs to render a board or a job stays
-- readable by any member.
do $$
declare
  spec record;
  existing record;
  read_predicate text;
  write_predicate text;
  legacy_fallback constant text :=
    '(organization_id is null and user_id = auth.uid())';
begin
  for spec in
    select *
    from (values
      ('leads',           'manager', 'manager'),
      ('estimates',       'manager', 'manager'),
      ('invoices',        'manager', 'manager'),
      ('payments',        'manager', 'manager'),
      ('automations',     'manager', 'manager'),
      ('automation_runs', 'manager', 'manager'),
      ('materials',       'member',  'manager'),
      ('pipeline_stages', 'member',  'manager'),
      ('client_folders',  'member',  'manager'),
      ('tasks',           'member',  'member')
    ) as t(tbl, read_level, write_level)
  loop
    continue when not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = spec.tbl
    );

    -- Replace wholesale so the resulting policy set is defined entirely here,
    -- and so re-running this migration is a no-op.
    for existing in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = spec.tbl
    loop
      execute format('drop policy if exists %I on public.%I', existing.policyname, spec.tbl);
    end loop;

    read_predicate := case spec.read_level
      when 'manager' then 'public.is_org_manager_or_above(organization_id)'
      else 'public.is_org_member(organization_id)'
    end;
    write_predicate := case spec.write_level
      when 'manager' then 'public.is_org_manager_or_above(organization_id)'
      else 'public.is_org_member(organization_id)'
    end;

    execute format(
      'create policy "org members read %1$s" on public.%1$I
         for select using (%2$s or %3$s)',
      spec.tbl, read_predicate, legacy_fallback
    );
    execute format(
      'create policy "org members insert %1$s" on public.%1$I
         for insert with check (%2$s or %3$s)',
      spec.tbl, write_predicate, legacy_fallback
    );
    execute format(
      'create policy "org members update %1$s" on public.%1$I
         for update using (%2$s or %3$s)',
      spec.tbl, write_predicate, legacy_fallback
    );
    execute format(
      'create policy "org members delete %1$s" on public.%1$I
         for delete using (%2$s or %3$s)',
      spec.tbl, write_predicate, legacy_fallback
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- clients: managers see all, workers see only what they are assigned
-- -----------------------------------------------------------------------------
do $$
declare
  existing record;
begin
  for existing in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'clients'
  loop
    execute format('drop policy if exists %I on public.clients', existing.policyname);
  end loop;
end $$;

create policy "org members read clients" on public.clients
  for select using (
    (
      public.is_org_member(organization_id)
      and (
        public.is_org_manager_or_above(organization_id)
        or public.user_is_assigned_to_client(clients.id)
      )
    )
    or (organization_id is null and user_id = auth.uid())
  );

create policy "org managers insert clients" on public.clients
  for insert with check (
    public.is_org_manager_or_above(organization_id)
    or (organization_id is null and user_id = auth.uid())
  );

create policy "org managers update clients" on public.clients
  for update using (
    public.is_org_manager_or_above(organization_id)
    or (organization_id is null and user_id = auth.uid())
  );

create policy "org managers delete clients" on public.clients
  for delete using (
    public.is_org_manager_or_above(organization_id)
    or (organization_id is null and user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- jobs: managers see all, workers see the jobs they are assigned to
-- -----------------------------------------------------------------------------
do $$
declare
  existing record;
begin
  for existing in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'jobs'
  loop
    execute format('drop policy if exists %I on public.jobs', existing.policyname);
  end loop;
end $$;

create policy "org members read jobs" on public.jobs
  for select using (
    (
      public.is_org_member(organization_id)
      and (
        public.is_org_manager_or_above(organization_id)
        or public.user_is_assigned_to_job(jobs.id)
      )
    )
    or (organization_id is null and user_id = auth.uid())
  );

create policy "org managers insert jobs" on public.jobs
  for insert with check (
    public.is_org_manager_or_above(organization_id)
    or (organization_id is null and user_id = auth.uid())
  );

-- A worker on site marks their own job complete, so update is not manager-only.
create policy "org members update jobs" on public.jobs
  for update using (
    (
      public.is_org_member(organization_id)
      and (
        public.is_org_manager_or_above(organization_id)
        or public.user_is_assigned_to_job(jobs.id)
      )
    )
    or (organization_id is null and user_id = auth.uid())
  );

create policy "org managers delete jobs" on public.jobs
  for delete using (
    public.is_org_manager_or_above(organization_id)
    or (organization_id is null and user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Line items: inherit visibility from the document they belong to
-- -----------------------------------------------------------------------------
-- These tables have no organization_id of their own, so they delegate rather
-- than duplicating the rule.
do $$
declare
  spec record;
  existing record;
begin
  for spec in
    select *
    from (values
      ('estimate_line_items', 'estimate_id', 'estimates'),
      ('invoice_line_items',  'invoice_id',  'invoices')
    ) as t(tbl, fk, parent)
  loop
    continue when not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = spec.tbl
    );

    for existing in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = spec.tbl
    loop
      execute format('drop policy if exists %I on public.%I', existing.policyname, spec.tbl);
    end loop;

    execute format(
      'create policy "org members read %1$s" on public.%1$I
         for all using (
           exists (
             select 1 from public.%3$I parent
             where parent.id = %1$I.%2$I
               and (
                 public.is_org_manager_or_above(parent.organization_id)
                 or (parent.organization_id is null and parent.user_id = auth.uid())
               )
           )
         )',
      spec.tbl, spec.fk, spec.parent
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Job child tables: inherit visibility from the job
-- -----------------------------------------------------------------------------
do $$
declare
  spec record;
  existing record;
begin
  for spec in
    select * from (values
      ('job_assignments'), ('job_equipment'), ('job_photos'), ('job_notes')
    ) as t(tbl)
  loop
    continue when not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = spec.tbl
    );

    for existing in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = spec.tbl
    loop
      execute format('drop policy if exists %I on public.%I', existing.policyname, spec.tbl);
    end loop;

    execute format(
      'create policy "org members access %1$s" on public.%1$I
         for all using (
           exists (
             select 1 from public.jobs j
             where j.id = %1$I.job_id
               and (
                 public.is_org_member(j.organization_id)
                 or (j.organization_id is null and j.user_id = auth.uid())
               )
           )
         )',
      spec.tbl
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- pipeline_stages: uniqueness belongs to the organization, not the user
-- -----------------------------------------------------------------------------
-- Stages are org-wide now, so per-user uniqueness would let two members create
-- "Qualified" twice in the same pipeline. Position is deliberately not unique:
-- a unique position makes reordering impossible without a deferrable constraint,
-- since any swap passes through a duplicate.
alter table public.pipeline_stages
  drop constraint if exists pipeline_stages_user_id_name_key;
alter table public.pipeline_stages
  drop constraint if exists pipeline_stages_user_id_position_key;

create unique index if not exists idx_pipeline_stages_org_name
  on public.pipeline_stages (organization_id, lower(name));

create index if not exists idx_pipeline_stages_org_position
  on public.pipeline_stages (organization_id, position);
