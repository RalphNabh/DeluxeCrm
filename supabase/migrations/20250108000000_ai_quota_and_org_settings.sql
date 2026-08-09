-- =============================================================================
-- Later backlog: atomic AI quota + richer org settings keys (documented)
-- =============================================================================

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_year_month text,
  p_cap integer
)
returns table (allowed boolean, new_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  -- Lock the row if it exists to prevent double-spend under concurrency.
  select u.count into current_count
  from public.ai_estimate_usage u
  where u.user_id = p_user_id and u.year_month = p_year_month
  for update;

  if current_count is null then
    if p_cap is not null and p_cap <= 0 then
      return query select false, 0;
      return;
    end if;

    insert into public.ai_estimate_usage (user_id, year_month, count, last_used_at)
    values (p_user_id, p_year_month, 1, now())
    on conflict (user_id, year_month) do update
      set count = public.ai_estimate_usage.count + 1,
          last_used_at = now()
    returning public.ai_estimate_usage.count into current_count;

    return query select true, current_count;
    return;
  end if;

  if p_cap is not null and current_count >= p_cap then
    return query select false, current_count;
    return;
  end if;

  update public.ai_estimate_usage
  set count = count + 1,
      last_used_at = now()
  where user_id = p_user_id and year_month = p_year_month
  returning count into current_count;

  return query select true, current_count;
end;
$$;

revoke all on function public.increment_ai_usage(uuid, text, integer) from public;
grant execute on function public.increment_ai_usage(uuid, text, integer) to service_role;

comment on function public.increment_ai_usage(uuid, text, integer) is
  'Atomically check and increment AI estimate monthly quota. Pass null/negative cap for unlimited.';

-- Document common organizations.settings keys used by the app.
comment on column public.organizations.settings is
  'JSONB org prefs: sms_notifications, email_notifications, weekly_reports, business_hours, invoice_defaults, branding';
