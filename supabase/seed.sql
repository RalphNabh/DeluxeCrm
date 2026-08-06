-- Local-development seed (runs only on `supabase start` / `supabase db reset`).
--
-- Why this exists:
-- The migrations in supabase/migrations are a squash of schema changes that
-- were originally applied to the hosted Supabase project through the SQL
-- editor (see supabase/README.md). Objects created that way are owned by
-- `supabase_admin`, whose default privileges grant full DML to the
-- anon / authenticated / service_role roles. When the same migrations are
-- applied to a fresh LOCAL stack, they run as the `postgres` role, whose
-- default privileges do NOT include SELECT/INSERT/UPDATE for those roles.
-- The result is a database where the app (which connects as authenticated
-- and service_role) gets "permission denied for table ...".
--
-- This seed reproduces the grants Supabase applies on the hosted project so
-- the app works locally. It is never used in production.
--
-- NOTE: Row Level Security policies from the migrations still apply — these
-- are table-level privileges only, which RLS then constrains per role.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Ensure objects created later (e.g. by future migrations run as postgres)
-- also get these grants.
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to anon, authenticated, service_role;
