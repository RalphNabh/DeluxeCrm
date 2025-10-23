-- Leads / Pipeline schema

-- Create an enum-like constraint for lead statuses via CHECK
-- Stages: New Leads, Estimate Sent, Approved, Job Scheduled, Completed

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  value numeric(12,2) default 0,
  status text not null default 'New Leads' check (status in (
    'New Leads',
    'Estimate Sent',
    'Approved',
    'Job Scheduled',
    'Completed'
  )),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Users can read own leads"
on public.leads for select
using (auth.uid() = user_id);

create policy "Users can insert own leads"
on public.leads for insert
with check (auth.uid() = user_id);

create policy "Users can update own leads"
on public.leads for update
using (auth.uid() = user_id);

create policy "Users can delete own leads"
on public.leads for delete
using (auth.uid() = user_id);

create or replace function public.handle_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_leads_updated_at on public.leads;
create trigger handle_leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_leads_updated_at();

create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_status on public.leads(status);



