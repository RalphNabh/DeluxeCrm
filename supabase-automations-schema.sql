-- Automations schema
-- Tables: automations, automation_runs, email_templates
-- Simple trigger engine will be implemented in API layer first

-- automations
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  trigger_event text not null, -- e.g., 'estimate_sent','estimate_approved','lead_stage_changed'
  trigger_filter jsonb,        -- optional filters (e.g., stages, min_total)
  action_type text not null,   -- e.g., 'send_email','update_lead','create_task'
  action_payload jsonb,        -- params for the action
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- email templates
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- automation runs (for audit)
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  event text not null,
  input jsonb,
  result text,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger automations_updated_at
before update on public.automations
for each row execute function public.handle_updated_at();

create trigger email_templates_updated_at
before update on public.email_templates
for each row execute function public.handle_updated_at();

-- RLS
alter table public.automations enable row level security;
alter table public.email_templates enable row level security;
alter table public.automation_runs enable row level security;

-- Policies: users can manage their own rows
create policy "Enable read own automations" on public.automations
for select using (auth.uid() = user_id);
create policy "Enable insert own automations" on public.automations
for insert with check (auth.uid() = user_id);
create policy "Enable update own automations" on public.automations
for update using (auth.uid() = user_id);
create policy "Enable delete own automations" on public.automations
for delete using (auth.uid() = user_id);

create policy "Enable read own email templates" on public.email_templates
for select using (auth.uid() = user_id);
create policy "Enable insert own email templates" on public.email_templates
for insert with check (auth.uid() = user_id);
create policy "Enable update own email templates" on public.email_templates
for update using (auth.uid() = user_id);
create policy "Enable delete own email templates" on public.email_templates
for delete using (auth.uid() = user_id);

create policy "Enable read own automation runs" on public.automation_runs
for select using (auth.uid() = user_id);
create policy "Enable insert own automation runs" on public.automation_runs
for insert with check (auth.uid() = user_id);
-- no update/delete on runs for now

-- Helpful indexes
create index if not exists idx_automations_user_active on public.automations(user_id, is_active);
create index if not exists idx_automations_trigger on public.automations(trigger_event);
create index if not exists idx_automation_runs_user on public.automation_runs(user_id);


