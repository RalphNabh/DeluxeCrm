-- Jobs schema
-- Tables: jobs, job_assignments, job_equipment
-- Complete job scheduling and management system

-- jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'Scheduled', -- Scheduled, In Progress, Completed, Cancelled
  location text,
  estimated_duration numeric(4,2), -- in hours
  actual_duration numeric(4,2), -- in hours
  team_members text[], -- array of team member names
  equipment text[], -- array of equipment needed
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- job_assignments table (for team member assignments)
create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null, -- 'Lead', 'Assistant', 'Specialist', etc.
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- job_equipment table (for equipment tracking)
create table if not exists public.job_equipment (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  equipment_name text not null,
  quantity integer not null default 1,
  condition text, -- 'Good', 'Needs Repair', 'Out of Service'
  notes text,
  created_at timestamptz not null default now()
);

-- job_photos table (for before/after photos)
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  photo_url text not null,
  photo_type text not null, -- 'Before', 'After', 'Progress', 'Issue'
  description text,
  uploaded_at timestamptz not null default now()
);

-- job_notes table (for progress notes and updates)
create table if not exists public.job_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null, -- 'Progress', 'Issue', 'Completion', 'Client Feedback'
  content text not null,
  is_public boolean not null default false, -- visible to client
  created_at timestamptz not null default now()
);

-- RLS Policies
alter table public.jobs enable row level security;
alter table public.job_assignments enable row level security;
alter table public.job_equipment enable row level security;
alter table public.job_photos enable row level security;
alter table public.job_notes enable row level security;

-- Jobs policies
create policy "Users can view their own jobs" on public.jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own jobs" on public.jobs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own jobs" on public.jobs
  for update using (auth.uid() = user_id);

create policy "Users can delete their own jobs" on public.jobs
  for delete using (auth.uid() = user_id);

-- Job assignments policies
create policy "Users can view job assignments for their jobs" on public.job_assignments
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can insert job assignments for their jobs" on public.job_assignments
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can update job assignments for their jobs" on public.job_assignments
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can delete job assignments for their jobs" on public.job_assignments
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job equipment policies
create policy "Users can view equipment for their jobs" on public.job_equipment
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can insert equipment for their jobs" on public.job_equipment
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can update equipment for their jobs" on public.job_equipment
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can delete equipment for their jobs" on public.job_equipment
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job photos policies
create policy "Users can view photos for their jobs" on public.job_photos
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can insert photos for their jobs" on public.job_photos
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can update photos for their jobs" on public.job_photos
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can delete photos for their jobs" on public.job_photos
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job notes policies
create policy "Users can view notes for their jobs" on public.job_notes
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can insert notes for their jobs" on public.job_notes
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can update notes for their jobs" on public.job_notes
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

create policy "Users can delete notes for their jobs" on public.job_notes
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.handle_updated_at();

-- Indexes for better performance
create index if not exists idx_jobs_user_id on public.jobs(user_id);
create index if not exists idx_jobs_client_id on public.jobs(client_id);
create index if not exists idx_jobs_start_time on public.jobs(start_time);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_job_assignments_job_id on public.job_assignments(job_id);
create index if not exists idx_job_equipment_job_id on public.job_equipment(job_id);
create index if not exists idx_job_photos_job_id on public.job_photos(job_id);
create index if not exists idx_job_notes_job_id on public.job_notes(job_id);
