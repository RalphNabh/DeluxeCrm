-- =============================================================================
-- One team, one table
-- =============================================================================
-- There were two parallel team systems. `organization_members` held real
-- multi-tenant memberships with auth users and roles, and was what the invite
-- flow wrote to. `team_members` held standalone name/email/phone cards with no
-- link to an auth user, and was what the Team page displayed. So inviting
-- someone never made them appear on the Team page.
--
-- Consolidate on organization_members plus organization_invitations, carrying
-- the legacy cards across as pending invitations so no contact is lost.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles.email
-- -----------------------------------------------------------------------------
-- auth.users is not reachable through PostgREST, so a member list built from
-- organization_members had no way to show an email address. /api/org/invitations
-- tried anyway, selecting user_profiles(full_name, email) against a table with
-- no email column, which is why the Team page never consumed its member list.
alter table public.user_profiles
  add column if not exists email text;

update public.user_profiles p
set email = u.email
from auth.users u
where u.id = p.user_id
  and p.email is distinct from u.email;

create index if not exists idx_user_profiles_email on public.user_profiles (email);

comment on column public.user_profiles.email is
  'Mirror of auth.users.email so member lists can be built through PostgREST';

-- -----------------------------------------------------------------------------
-- Keep the mirror current
-- -----------------------------------------------------------------------------
create or replace function public.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set email = new.email
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_user_profile_email on auth.users;
create trigger sync_user_profile_email
  after update of email on auth.users
  for each row execute function public.sync_user_profile_email();

-- -----------------------------------------------------------------------------
-- Invitations carry the details a team card used to hold
-- -----------------------------------------------------------------------------
alter table public.organization_invitations
  add column if not exists invited_name text,
  add column if not exists invited_phone text,
  add column if not exists revoked_at timestamptz;

comment on column public.organization_invitations.invited_name is
  'Name to address the invitation email to, before the person has a profile';
comment on column public.organization_invitations.revoked_at is
  'Set when an invitation is withdrawn, rather than deleting the audit trail';

-- -----------------------------------------------------------------------------
-- Carry legacy team cards across as pending invitations
-- -----------------------------------------------------------------------------
-- Skips anyone who is already a member or already has an open invitation, and
-- skips rows with no organization, since an invitation must belong to one.
do $$
declare
  inviter uuid;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'team_members'
  ) then
    return;
  end if;

  insert into public.organization_invitations
    (org_id, email, role, invited_by, invited_name, invited_phone, expires_at)
  select distinct on (tm.organization_id, lower(tm.email))
    tm.organization_id,
    lower(tm.email),
    case lower(tm.role)
      when 'owner' then 'admin'
      when 'admin' then 'admin'
      when 'manager' then 'manager'
      else 'worker'
    end,
    coalesce(org.owner_user_id, tm.user_id),
    tm.name,
    tm.phone,
    now() + interval '30 days'
  from public.team_members tm
  join public.organizations org on org.id = tm.organization_id
  where tm.organization_id is not null
    and nullif(trim(tm.email), '') is not null
    and not exists (
      select 1
      from public.organization_members om
      join public.user_profiles up on up.user_id = om.user_id
      where om.org_id = tm.organization_id
        and lower(up.email) = lower(tm.email)
    )
    and not exists (
      select 1 from public.organization_invitations oi
      where oi.org_id = tm.organization_id
        and lower(oi.email) = lower(tm.email)
    )
  order by tm.organization_id, lower(tm.email), tm.created_at;
end $$;

drop table if exists public.team_members;
