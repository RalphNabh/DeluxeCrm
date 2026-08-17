-- Client Hub change-request notes, and let thread participants bump last_message_at.

alter table public.estimates
  add column if not exists change_request_note text;

comment on column public.estimates.change_request_note is
  'Latest note from the client when they request changes on an estimate.';

drop policy if exists "Participants update conversations" on public.conversations;
create policy "Participants update conversations" on public.conversations
  for update using (
    organization_id in (select public.user_org_ids())
    or exists (
      select 1 from public.client_portal_users cpu
      where cpu.auth_user_id = auth.uid()
        and cpu.client_id = conversations.client_id
        and cpu.status = 'active'
    )
  );
