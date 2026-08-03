-- =============================================================================
-- Schema invariants
-- =============================================================================
-- Guards the drift that accumulated while schema changes were applied by hand:
-- columns the application reads, CHECK constraints the application writes
-- against, and the org-scoped RLS policies multi-tenancy depends on.
--
-- Run via scripts/verify-migrations.sh. Any failure raises and aborts.
-- =============================================================================

create or replace function pg_temp.expect(condition boolean, description text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'FAILED: %', description;
  end if;
  raise notice '  ok  %', description;
end;
$$;

create or replace function pg_temp.has_column(tbl text, col text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = tbl and column_name = col
  );
$$;

create or replace function pg_temp.has_policy(tbl text, policy_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = tbl and policyname = policy_name
  );
$$;

create or replace function pg_temp.check_clause(tbl text, needle text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = tbl
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%' || needle || '%'
  );
$$;

do $$
declare
  tenant_table text;
  -- Tables holding tenant data, which must carry organization_id and be
  -- readable by the whole org rather than only the row's creator.
  tenant_tables text[] := array[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'materials', 'tasks', 'automations', 'pipeline_stages'
  ];
begin
  raise notice 'core tables';
  perform pg_temp.expect(
    (select count(*) from information_schema.tables
      where table_schema = 'public'
        and table_name = any (array[
          'clients', 'leads', 'estimates', 'estimate_line_items', 'invoices',
          'invoice_line_items', 'payments', 'jobs', 'materials', 'tasks',
          'automations', 'automation_runs', 'subscriptions', 'organizations',
          'organization_members', 'client_portal_users', 'service_requests',
          'pipeline_stages', 'user_profiles'
        ])) = 19,
    'all core tables exist'
  );

  raise notice 'payments columns match the API insert';
  perform pg_temp.expect(pg_temp.has_column('payments', 'payment_method'), 'payments.payment_method exists');
  perform pg_temp.expect(pg_temp.has_column('payments', 'payment_date'), 'payments.payment_date exists');
  perform pg_temp.expect(pg_temp.has_column('payments', 'user_id'), 'payments.user_id exists');
  perform pg_temp.expect(pg_temp.has_column('payments', 'organization_id'), 'payments.organization_id exists');

  -- Columns the application reads that no schema file ever defined.
  raise notice 'estimate columns the app reads';
  perform pg_temp.expect(pg_temp.has_column('estimates', 'sent_at'), 'estimates.sent_at exists');
  perform pg_temp.expect(pg_temp.has_column('estimates', 'estimate_number'), 'estimates.estimate_number exists');
  perform pg_temp.expect(pg_temp.has_column('estimates', 'valid_until'), 'estimates.valid_until exists');

  raise notice 'status constraints match what the app writes';
  perform pg_temp.expect(
    pg_temp.check_clause('estimates', 'Changes Requested'),
    'estimates status CHECK allows ''Changes Requested'''
  );
  perform pg_temp.expect(
    not pg_temp.check_clause('leads', 'Estimate Sent'),
    'leads.status CHECK dropped so custom pipeline stages can be saved'
  );

  -- Explicit lead↔client link so creating a client does not spawn a duplicate
  -- pipeline card, and deleting a client can clean up by FK rather than name.
  raise notice 'lead-client link';
  perform pg_temp.expect(pg_temp.has_column('leads', 'client_id'), 'leads.client_id exists');
  perform pg_temp.expect(
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and indexname = 'idx_estimates_number_per_org'
    ),
    'estimates number unique index exists'
  );

  raise notice 'every tenant table carries organization_id';
  foreach tenant_table in array tenant_tables loop
    perform pg_temp.expect(
      pg_temp.has_column(tenant_table, 'organization_id'),
      format('%s.organization_id exists', tenant_table)
    );
  end loop;

  -- Team collaboration depends on these. While they were owner-only, a
  -- teammate saw an empty app no matter what the API sent.
  raise notice 'tenant tables are readable by the organization, not just the owner';
  foreach tenant_table in array tenant_tables loop
    perform pg_temp.expect(
      exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tenant_table
          and cmd in ('SELECT', 'ALL')
          and qual like '%is_org_%'
      ),
      format('%s has an org-scoped read policy', tenant_table)
    );
    perform pg_temp.expect(
      not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tenant_table
          and coalesce(qual, with_check) = '(auth.uid() = user_id)'
      ),
      format('%s has no owner-only policy left', tenant_table)
    );
  end loop;

  raise notice 'line items inherit access from their document';
  perform pg_temp.expect(
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'estimate_line_items'
        and qual like '%is_org_manager_or_above%'
    ),
    'estimate_line_items delegates to estimates'
  );
  perform pg_temp.expect(
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'invoice_line_items'
        and qual like '%is_org_manager_or_above%'
    ),
    'invoice_line_items delegates to invoices'
  );

  raise notice 'workers are limited to what they are assigned';
  perform pg_temp.expect(
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'jobs'
        and cmd = 'SELECT' and qual like '%user_is_assigned_to_job%'
    ),
    'jobs read policy honours job assignments'
  );
  perform pg_temp.expect(
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'clients'
        and cmd = 'SELECT' and qual like '%user_is_assigned_to_client%'
    ),
    'clients read policy honours client assignments'
  );

  raise notice 'pipeline stage names are unique per organization';
  perform pg_temp.expect(
    exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'idx_pipeline_stages_org_name'
    ),
    'pipeline_stages has an org-scoped unique name index'
  );

  raise notice 'automations are not world-readable';
  perform pg_temp.expect(
    not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'automations'
        and cmd = 'SELECT'
        and qual = 'true'
    ),
    'automations has no unrestricted SELECT policy'
  );

  raise notice 'row level security enabled on tenant tables';
  foreach tenant_table in array tenant_tables loop
    perform pg_temp.expect(
      (select relrowsecurity from pg_class where oid = format('public.%s', tenant_table)::regclass),
      format('RLS enabled on %s', tenant_table)
    );
  end loop;
end $$;

\echo 'all schema invariants hold'
