-- =============================================================================
-- Zapier private OAuth2 integration: lead source tagging + auth codes/tokens
-- =============================================================================
-- Lets contractors click "Connect with Zapier" and approve access via their
-- normal DyluxePro login instead of copy-pasting a webhook URL/token.
-- =============================================================================

alter table public.service_requests
  add column if not exists source text not null default 'public_form'
    check (source in ('public_form', 'portal', 'zapier', 'manual')),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.oauth_authorization_codes (
  code text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_auth_codes_expires
  on public.oauth_authorization_codes (expires_at);

create table if not exists public.oauth_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  refresh_token_hash text unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_access_tokens_org
  on public.oauth_access_tokens (organization_id);

create index if not exists idx_oauth_access_tokens_refresh
  on public.oauth_access_tokens (refresh_token_hash)
  where refresh_token_hash is not null;

alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_access_tokens enable row level security;

comment on table public.oauth_authorization_codes is
  'Short-lived codes issued by /oauth/authorize, exchanged once at /api/oauth/token. Service-role only, no client policies.';
comment on table public.oauth_access_tokens is
  'Hashed bearer/refresh tokens for external OAuth clients (currently Zapier). Service-role only, no client policies.';
