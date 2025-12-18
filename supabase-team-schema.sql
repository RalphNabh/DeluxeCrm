-- Team members schema
-- Table: team_members
-- Team management system for contractors

-- team_members table
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'Worker', -- Owner, Manager, Worker, Admin
  status text not null default 'Pending', -- Active, Inactive, Pending
  joined_at timestamptz not null default now(),
  last_active timestamptz,
  jobs_completed integer default 0,
  total_hours numeric(10,2) default 0,
  avatar text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS Policies
alter table public.team_members enable row level security;

create policy "Enable read own team members" on public.team_members
  for select using (auth.uid() = user_id);

create policy "Enable insert own team members" on public.team_members
  for insert with check (auth.uid() = user_id);

create policy "Enable update own team members" on public.team_members
  for update using (auth.uid() = user_id);

create policy "Enable delete own team members" on public.team_members
  for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_status on public.team_members(status);
create index if not exists idx_team_members_role on public.team_members(role);

-- Updated_at trigger
create trigger team_members_updated_at
before update on public.team_members
for each row execute procedure public.handle_updated_at();

