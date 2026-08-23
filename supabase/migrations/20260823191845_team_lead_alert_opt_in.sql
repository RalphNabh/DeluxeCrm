-- Per-teammate opt-in for lead alert emails, set from the Team page instead
-- of a free-text recipient list in Settings. Lives on both the membership
-- (accepted teammates) and the invitation (so the choice survives accept).
alter table public.organization_members
  add column if not exists receives_lead_alerts boolean not null default false;

alter table public.organization_invitations
  add column if not exists receives_lead_alerts boolean not null default false;
