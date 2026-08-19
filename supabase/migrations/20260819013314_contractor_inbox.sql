-- One-query unread counts + last-message preview for contractor inbox.
-- Service role only: APIs already use the service client.

create or replace function public.contractor_inbox(p_org_id uuid)
returns table (
  conversation_id uuid,
  unread_count bigint,
  last_body text,
  last_created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with last_msg as (
    select distinct on (m.conversation_id)
      m.conversation_id,
      m.body as last_body,
      m.created_at as last_created_at
    from public.messages m
    inner join public.conversations c on c.id = m.conversation_id
    where c.organization_id = p_org_id
    order by m.conversation_id, m.created_at desc
  ),
  unread as (
    select
      m.conversation_id,
      count(*)::bigint as unread_count
    from public.messages m
    inner join public.conversations c on c.id = m.conversation_id
    where c.organization_id = p_org_id
      and m.sender_type = 'client'
      and m.read_at is null
    group by m.conversation_id
  )
  select
    c.id as conversation_id,
    coalesce(u.unread_count, 0) as unread_count,
    lm.last_body,
    lm.last_created_at
  from public.conversations c
  left join last_msg lm on lm.conversation_id = c.id
  left join unread u on u.conversation_id = c.id
  where c.organization_id = p_org_id;
$$;

revoke all on function public.contractor_inbox(uuid) from public;
revoke all on function public.contractor_inbox(uuid) from anon, authenticated;
grant execute on function public.contractor_inbox(uuid) to service_role;

comment on function public.contractor_inbox(uuid) is
  'Unread client-message counts and last-message preview per conversation in an org. Service role only.';

-- Persist Hub email throttle on the conversation (serverless-safe; replaces in-memory Map).
alter table public.conversations
  add column if not exists last_alert_at timestamptz;
