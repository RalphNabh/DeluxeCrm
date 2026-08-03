-- =============================================================================
-- Supabase primitive shim (local verification only)
-- =============================================================================
-- Supabase's hosted Postgres ships an `auth` schema, a `storage` schema and the
-- anon/authenticated/service_role roles. A bare Postgres does not, so applying
-- our migrations to a scratch database fails on those references.
--
-- This file recreates only the primitives our migrations touch, so that
-- scripts/verify-migrations.sh can apply the real migrations unmodified. It is
-- never applied to a Supabase project.
-- =============================================================================

-- Supabase enables pgcrypto by default; gen_random_bytes() comes from it.
create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists storage;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase derives the caller from the request JWT. Locally we read a GUC so
-- tests can impersonate a user with: set local request.jwt.claim.sub = '<uuid>'
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true), ('ai-estimates', 'ai-estimates', false)
on conflict (id) do nothing;

-- Supabase Realtime ships this publication; the portal schema adds tables to it.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
