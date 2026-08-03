-- =============================================================================
-- Row level security behaviour
-- =============================================================================
-- Asserting a policy exists is not the same as asserting it does the right
-- thing. These tests impersonate real users and check what each one can see.
--
-- The bug being pinned down: while tenant tables were owner-only, inviting a
-- teammate produced an empty app. A manager must see the owner's records; a
-- worker must see only what they are assigned; nobody may see another
-- organization's data.
--
-- Impersonation uses the shim's auth.uid(), which reads request.jwt.claim.sub,
-- combined with `set local role authenticated` so policies are enforced (they
-- are bypassed for superusers).
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

-- `authenticated` needs table privileges before RLS is even consulted. Supabase
-- grants these by default; the scratch database does not.
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- Fixtures: one organization with an owner, a manager and a worker, plus a
-- second organization that must stay invisible to the first.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'owner@acme.test'),
  ('a0000000-0000-4000-8000-000000000002', 'manager@acme.test'),
  ('a0000000-0000-4000-8000-000000000003', 'worker@acme.test'),
  ('a0000000-0000-4000-8000-000000000004', 'rival@other.test');

insert into public.organizations (id, name, owner_user_id) values
  ('b0000000-0000-4000-8000-000000000001', 'Acme Contracting', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 'Rival Roofing', 'a0000000-0000-4000-8000-000000000004');

insert into public.organization_members (org_id, user_id, role, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'manager', 'active'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'worker', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'owner', 'active');

-- Records created by the owner, which is the situation that was broken.
insert into public.clients (id, user_id, organization_id, name, email) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Assigned Client', 'assigned@example.test'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Unassigned Client', 'unassigned@example.test');

insert into public.clients (id, user_id, organization_id, name) values
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000002', 'Rival Client');

insert into public.estimates (id, user_id, organization_id, client_id, subtotal, tax, total, status)
values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   1000, 130, 1130, 'Sent');

insert into public.estimate_line_items (estimate_id, description, quantity, unit_price, total)
values ('d0000000-0000-4000-8000-000000000001', 'Reroof garage', 1, 1000, 1000);

insert into public.jobs (id, user_id, organization_id, client_id, title, start_time, end_time)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Assigned job', now(), now() + interval '2 hours'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Someone else''s job', now(), now() + interval '2 hours');

insert into public.job_assignments (job_id, user_id, role) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Lead');

insert into public.client_assignments (org_id, client_id, member_user_id) values
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000003');

-- A row predating organization_id, which must stay visible to its creator.
insert into public.clients (id, user_id, organization_id, name) values
  ('c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001',
   null, 'Legacy Client');

-- -----------------------------------------------------------------------------
-- A manager sees the owner's records
-- -----------------------------------------------------------------------------
do $$
declare
  visible_clients int;
  visible_estimates int;
  visible_line_items int;
  visible_jobs int;
begin
  raise notice 'manager (invited teammate)';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);

  select count(*) into visible_clients from public.clients;
  select count(*) into visible_estimates from public.estimates;
  select count(*) into visible_line_items from public.estimate_line_items;
  select count(*) into visible_jobs from public.jobs;

  perform pg_temp.expect(visible_clients = 2, 'manager sees both org clients');
  perform pg_temp.expect(visible_estimates = 1, 'manager sees the owner''s estimate');
  perform pg_temp.expect(visible_line_items = 1, 'manager sees the estimate line items');
  perform pg_temp.expect(visible_jobs = 2, 'manager sees all org jobs');
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- A worker sees only assigned work, and no financials
-- -----------------------------------------------------------------------------
do $$
declare
  visible_clients int;
  visible_estimates int;
  visible_invoices int;
  visible_jobs int;
  assigned_job_title text;
begin
  raise notice 'worker (limited crew member)';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);

  select count(*) into visible_clients from public.clients;
  select count(*) into visible_estimates from public.estimates;
  select count(*) into visible_invoices from public.invoices;
  select count(*) into visible_jobs from public.jobs;
  select title into assigned_job_title from public.jobs limit 1;

  perform pg_temp.expect(visible_clients = 1, 'worker sees only their assigned client');
  perform pg_temp.expect(visible_jobs = 1, 'worker sees only their assigned job');
  perform pg_temp.expect(assigned_job_title = 'Assigned job', 'worker sees the right job');
  perform pg_temp.expect(visible_estimates = 0, 'worker sees no estimates');
  perform pg_temp.expect(visible_invoices = 0, 'worker sees no invoices');
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Another organization sees nothing
-- -----------------------------------------------------------------------------
do $$
declare
  visible_clients int;
  visible_estimates int;
  visible_jobs int;
  own_client text;
begin
  raise notice 'unrelated organization';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);

  select count(*) into visible_clients from public.clients;
  select count(*) into visible_estimates from public.estimates;
  select count(*) into visible_jobs from public.jobs;
  select name into own_client from public.clients limit 1;

  perform pg_temp.expect(visible_clients = 1, 'rival sees only their own client');
  perform pg_temp.expect(own_client = 'Rival Client', 'rival sees the correct client');
  perform pg_temp.expect(visible_estimates = 0, 'rival sees no estimates from another org');
  perform pg_temp.expect(visible_jobs = 0, 'rival sees no jobs from another org');
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- The owner keeps access, including rows with no organization
-- -----------------------------------------------------------------------------
do $$
declare
  visible_clients int;
  sees_legacy boolean;
begin
  raise notice 'owner';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

  select count(*) into visible_clients from public.clients;
  select exists (
    select 1 from public.clients where name = 'Legacy Client'
  ) into sees_legacy;

  perform pg_temp.expect(visible_clients = 3, 'owner sees org clients plus the legacy row');
  perform pg_temp.expect(sees_legacy, 'a row with no organization_id stays visible to its creator');
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Writes are gated too
-- -----------------------------------------------------------------------------
do $$
declare
  blocked boolean := false;
begin
  raise notice 'write restrictions';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);

  begin
    insert into public.estimates
      (user_id, organization_id, client_id, subtotal, tax, total, status)
    values
      ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
       'c0000000-0000-4000-8000-000000000001', 10, 1, 11, 'Draft');
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.expect(blocked, 'worker cannot create an estimate');

  blocked := false;
  begin
    update public.jobs set status = 'Completed'
    where id = 'e0000000-0000-4000-8000-000000000002';
    blocked := not found;
  end;
  perform pg_temp.expect(blocked, 'worker cannot update a job they are not assigned to');

  update public.jobs set status = 'Completed'
  where id = 'e0000000-0000-4000-8000-000000000001';
  perform pg_temp.expect(found, 'worker can complete their own assigned job');
end $$;
reset role;

\echo 'row level security behaves correctly for owner, manager, worker and outsiders'
