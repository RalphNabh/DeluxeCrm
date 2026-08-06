-- =============================================================================
-- DyluxePro baseline schema
-- =============================================================================
-- Squashed from the 32 hand-applied root-level .sql files that preceded
-- migration tooling. Applying this to an empty database reproduces the schema
-- those files produced, in dependency order.
--
-- Existing deployments: this migration is already reflected in your database.
-- Mark it applied instead of running it:
--     supabase migration repair --status applied 00000000000000
--
-- Every schema change after this point belongs in its own timestamped
-- migration in this directory. Do not add .sql files to the repository root.
-- =============================================================================


-- =============================================================================
-- source: supabase-schema.sql
-- =============================================================================

-- Create the clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.clients enable row level security;

-- Create RLS policies
drop policy if exists "Users can read own clients" on public.clients;
create policy "Users can read own clients"
on public.clients for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients"
on public.clients for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients"
on public.clients for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients"
on public.clients for delete
using (auth.uid() = user_id);

-- Create function to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
drop trigger if exists handle_clients_updated_at on public.clients;
create trigger handle_clients_updated_at
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

-- Create an index on user_id for better performance
create index if not exists idx_clients_user_id on public.clients(user_id);

-- Insert some sample data (optional - remove if you don't want sample data)
-- Note: This will only work after you have created a user account
-- You can uncomment this after signing up for the first time
/*
insert into public.clients (user_id, name, email, phone, address, notes) values
  ((select auth.uid()), 'John Smith', 'john@example.com', '555-0123', '123 Main St, City, State', 'Regular customer, prefers morning appointments'),
  ((select auth.uid()), 'Sarah Johnson', 'sarah@example.com', '555-0456', '456 Oak Ave, City, State', 'New customer, interested in our services'),
  ((select auth.uid()), 'Mike Wilson', 'mike@example.com', '555-0789', '789 Pine Rd, City, State', 'Commercial property owner');
*/

-- =============================================================================
-- source: supabase-clients-alter.sql
-- =============================================================================

-- Add total_value column to clients for displaying current client value
alter table public.clients
  add column if not exists total_value numeric(12,2) not null default 0;

create index if not exists idx_clients_total_value on public.clients(total_value);

-- =============================================================================
-- source: supabase-user-profiles-schema.sql
-- =============================================================================

-- User Profiles Schema
-- Stores extended user information beyond what's in auth.users

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name text,
  last_name text,
  full_name text,
  date_of_birth date,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  
  -- Company/Business Information
  company_name text,
  job_title text,
  business_type text,
  
  -- Profile Picture
  avatar_url text,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index if not exists for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view and update their own profile
drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
  on public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
drop trigger if exists update_user_profiles_updated_at on public.user_profiles;
create trigger update_user_profiles_updated_at
  BEFORE UPDATE on public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, user_id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup (if trigger doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  AFTER INSERT on auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- source: supabase-client-folders-tags-schema.sql
-- =============================================================================

-- Client Folders and Tags Schema
-- This extends the clients table with organization capabilities

-- Add tags column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create client_folders table for organizing clients
CREATE TABLE IF NOT EXISTS public.client_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3b82f6', -- Default blue color
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add folder_id to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.client_folders(id) ON DELETE SET NULL;

-- Enable Row Level Security on client_folders
ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_folders
drop policy if exists "Users can view their own folders" on public.client_folders;
create policy "Users can view their own folders"
  on public.client_folders FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own folders" on public.client_folders;
create policy "Users can insert their own folders"
  on public.client_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own folders" on public.client_folders;
create policy "Users can update their own folders"
  on public.client_folders FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "Users can delete their own folders" on public.client_folders;
create policy "Users can delete their own folders"
  on public.client_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_folders_user_id ON public.client_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_folder_id ON public.clients(folder_id);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON public.clients USING GIN(tags);

-- Create trigger to update updated_at for client_folders
drop trigger if exists handle_client_folders_updated_at on public.client_folders;
create trigger handle_client_folders_updated_at
  BEFORE UPDATE on public.client_folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Comments for documentation
COMMENT ON COLUMN public.clients.tags IS 'Array of tags for organizing clients (e.g., ["Residential", "High Priority"])';
COMMENT ON COLUMN public.clients.folder_id IS 'Reference to the folder this client belongs to';
COMMENT ON TABLE public.client_folders IS 'Custom folders for organizing clients';

-- =============================================================================
-- source: supabase-leads-schema.sql
-- =============================================================================

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

drop policy if exists "Users can read own leads" on public.leads;
create policy "Users can read own leads"
on public.leads for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own leads" on public.leads;
create policy "Users can insert own leads"
on public.leads for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own leads" on public.leads;
create policy "Users can update own leads"
on public.leads for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own leads" on public.leads;
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
drop trigger if exists handle_leads_updated_at on public.leads;
create trigger handle_leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_leads_updated_at();

create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_status on public.leads(status);

-- =============================================================================
-- source: supabase-leads-tags-schema.sql
-- =============================================================================

-- Add tags column to leads table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index if not exists for tag filtering
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.leads.tags IS 'Array of tags for organizing and filtering leads';

-- =============================================================================
-- source: supabase-leads-add-folder.sql
-- =============================================================================

-- Add folder_id column to leads table to support folder organization
-- This allows leads to be organized into folders similar to clients

-- Add folder_id column (nullable, references client_folders)
alter table public.leads
add column if not exists folder_id uuid references public.client_folders(id) on delete set null;

-- Create index if not exists for folder filtering
create index if not exists idx_leads_folder_id on public.leads(folder_id);

-- Add comment
comment on column public.leads.folder_id is 'Optional folder assignment for organizing leads';

-- =============================================================================
-- source: supabase-pipeline-stages-schema.sql
-- =============================================================================

-- Pipeline Stages Schema
-- Run this SQL in your Supabase SQL Editor to create the pipeline_stages table

-- Create the pipeline_stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3b82f6', -- Default blue color
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, name),
  UNIQUE(user_id, position)
);

-- Enable Row Level Security
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pipeline stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can insert their own pipeline stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can update their own pipeline stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can delete their own pipeline stages" ON public.pipeline_stages;

-- RLS Policies
drop policy if exists "Users can view their own pipeline stages" on public.pipeline_stages;
create policy "Users can view their own pipeline stages"
  on public.pipeline_stages FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own pipeline stages" on public.pipeline_stages;
create policy "Users can insert their own pipeline stages"
  on public.pipeline_stages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own pipeline stages" on public.pipeline_stages;
create policy "Users can update their own pipeline stages"
  on public.pipeline_stages FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "Users can delete their own pipeline stages" on public.pipeline_stages;
create policy "Users can delete their own pipeline stages"
  on public.pipeline_stages FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user_id ON public.pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(user_id, position);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_pipeline_stages_updated_at ON public.pipeline_stages;

-- Create trigger to update updated_at
drop trigger if exists handle_pipeline_stages_updated_at on public.pipeline_stages;
create trigger handle_pipeline_stages_updated_at
  BEFORE UPDATE on public.pipeline_stages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.pipeline_stages IS 'Customizable pipeline stages for sales pipeline';
COMMENT ON COLUMN public.pipeline_stages.position IS 'Order/position of the stage in the pipeline';
COMMENT ON COLUMN public.pipeline_stages.color IS 'Hex color code for the stage';

-- Insert default stages for existing users (optional - can be done via API on first load)
-- This is handled by the API route on first access

-- =============================================================================
-- source: supabase-estimates-schema.sql
-- =============================================================================

-- Estimates schema

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'Draft' check (status in ('Draft','Sent','Approved','Rejected','Scheduled','Completed')),
  subtotal numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit text default 'unit',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);

alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;

drop policy if exists "Users can read own estimates" on public.estimates;
create policy "Users can read own estimates" on public.estimates for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own estimates" on public.estimates;
create policy "Users can insert own estimates" on public.estimates for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own estimates" on public.estimates;
create policy "Users can update own estimates" on public.estimates for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own estimates" on public.estimates;
create policy "Users can delete own estimates" on public.estimates for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own estimate items" on public.estimate_line_items;
create policy "Users can read own estimate items" on public.estimate_line_items for select using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
drop policy if exists "Users can insert own estimate items" on public.estimate_line_items;
create policy "Users can insert own estimate items" on public.estimate_line_items for insert with check (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
drop policy if exists "Users can update own estimate items" on public.estimate_line_items;
create policy "Users can update own estimate items" on public.estimate_line_items for update using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
drop policy if exists "Users can delete own estimate items" on public.estimate_line_items;
create policy "Users can delete own estimate items" on public.estimate_line_items for delete using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);

create or replace function public.handle_estimates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_estimates_updated_at on public.estimates;
drop trigger if exists handle_estimates_updated_at on public.estimates;
create trigger handle_estimates_updated_at
  before update on public.estimates
  for each row execute procedure public.handle_estimates_updated_at();

create index if not exists idx_estimates_user_id on public.estimates(user_id);
create index if not exists idx_estimates_client_id on public.estimates(client_id);
create index if not exists idx_estimates_status on public.estimates(status);

-- =============================================================================
-- source: supabase-estimates-tags-schema.sql
-- =============================================================================

-- Add tags column to estimates table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index if not exists for tag filtering
CREATE INDEX IF NOT EXISTS idx_estimates_tags ON public.estimates USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.estimates.tags IS 'Array of tags for organizing and filtering estimates';

-- =============================================================================
-- source: supabase-estimates-contract-message-schema.sql
-- =============================================================================

-- Add contract_message column to estimates table
-- Run this SQL in your Supabase SQL Editor

-- Add contract_message column if it doesn't exist
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS contract_message text;

-- Comment for documentation
COMMENT ON COLUMN public.estimates.contract_message IS 'Custom message/terms to include in the estimate contract';

-- =============================================================================
-- source: supabase-invoices-schema.sql
-- =============================================================================

-- Invoices schema
-- Tables: invoices, invoice_line_items, payments
-- Complete financial management system

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  estimate_id uuid references public.estimates(id),
  invoice_number text not null,
  status text not null default 'Draft', -- Draft, Sent, Paid, Overdue, Cancelled
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoice line items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'unit',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_method text not null, -- Cash, Check, Credit Card, Bank Transfer
  payment_date date not null,
  reference text, -- Check number, transaction ID, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- updated_at triggers
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
before update on public.invoices
for each row execute function public.handle_updated_at();

-- RLS
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;

-- Policies
drop policy if exists "Enable read own invoices" on public.invoices;
create policy "Enable read own invoices" on public.invoices
for select using (auth.uid() = user_id);
drop policy if exists "Enable insert own invoices" on public.invoices;
create policy "Enable insert own invoices" on public.invoices
for insert with check (auth.uid() = user_id);
drop policy if exists "Enable update own invoices" on public.invoices;
create policy "Enable update own invoices" on public.invoices
for update using (auth.uid() = user_id);
drop policy if exists "Enable delete own invoices" on public.invoices;
create policy "Enable delete own invoices" on public.invoices
for delete using (auth.uid() = user_id);

drop policy if exists "Enable read own invoice line items" on public.invoice_line_items;
create policy "Enable read own invoice line items" on public.invoice_line_items
for select using (auth.uid() = (select user_id from public.invoices where id = invoice_id));
drop policy if exists "Enable insert own invoice line items" on public.invoice_line_items;
create policy "Enable insert own invoice line items" on public.invoice_line_items
for insert with check (auth.uid() = (select user_id from public.invoices where id = invoice_id));
drop policy if exists "Enable update own invoice line items" on public.invoice_line_items;
create policy "Enable update own invoice line items" on public.invoice_line_items
for update using (auth.uid() = (select user_id from public.invoices where id = invoice_id));
drop policy if exists "Enable delete own invoice line items" on public.invoice_line_items;
create policy "Enable delete own invoice line items" on public.invoice_line_items
for delete using (auth.uid() = (select user_id from public.invoices where id = invoice_id));

drop policy if exists "Enable read own payments" on public.payments;
create policy "Enable read own payments" on public.payments
for select using (auth.uid() = user_id);
drop policy if exists "Enable insert own payments" on public.payments;
create policy "Enable insert own payments" on public.payments
for insert with check (auth.uid() = user_id);
drop policy if exists "Enable update own payments" on public.payments;
create policy "Enable update own payments" on public.payments
for update using (auth.uid() = user_id);
drop policy if exists "Enable delete own payments" on public.payments;
create policy "Enable delete own payments" on public.payments
for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_invoices_user_status on public.invoices(user_id, status);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_estimate on public.invoices(estimate_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_user on public.payments(user_id);

-- =============================================================================
-- source: supabase-jobs-schema.sql
-- =============================================================================

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
drop policy if exists "Users can view their own jobs" on public.jobs;
create policy "Users can view their own jobs" on public.jobs
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own jobs" on public.jobs;
create policy "Users can insert their own jobs" on public.jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own jobs" on public.jobs;
create policy "Users can update their own jobs" on public.jobs
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own jobs" on public.jobs;
create policy "Users can delete their own jobs" on public.jobs
  for delete using (auth.uid() = user_id);

-- Job assignments policies
drop policy if exists "Users can view job assignments for their jobs" on public.job_assignments;
create policy "Users can view job assignments for their jobs" on public.job_assignments
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert job assignments for their jobs" on public.job_assignments;
create policy "Users can insert job assignments for their jobs" on public.job_assignments
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update job assignments for their jobs" on public.job_assignments;
create policy "Users can update job assignments for their jobs" on public.job_assignments
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete job assignments for their jobs" on public.job_assignments;
create policy "Users can delete job assignments for their jobs" on public.job_assignments
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_assignments.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job equipment policies
drop policy if exists "Users can view equipment for their jobs" on public.job_equipment;
create policy "Users can view equipment for their jobs" on public.job_equipment
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert equipment for their jobs" on public.job_equipment;
create policy "Users can insert equipment for their jobs" on public.job_equipment
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update equipment for their jobs" on public.job_equipment;
create policy "Users can update equipment for their jobs" on public.job_equipment
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete equipment for their jobs" on public.job_equipment;
create policy "Users can delete equipment for their jobs" on public.job_equipment
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_equipment.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job photos policies
drop policy if exists "Users can view photos for their jobs" on public.job_photos;
create policy "Users can view photos for their jobs" on public.job_photos
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert photos for their jobs" on public.job_photos;
create policy "Users can insert photos for their jobs" on public.job_photos
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update photos for their jobs" on public.job_photos;
create policy "Users can update photos for their jobs" on public.job_photos
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete photos for their jobs" on public.job_photos;
create policy "Users can delete photos for their jobs" on public.job_photos
  for delete using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_photos.job_id 
      and jobs.user_id = auth.uid()
    )
  );

-- Job notes policies
drop policy if exists "Users can view notes for their jobs" on public.job_notes;
create policy "Users can view notes for their jobs" on public.job_notes
  for select using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert notes for their jobs" on public.job_notes;
create policy "Users can insert notes for their jobs" on public.job_notes
  for insert with check (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update notes for their jobs" on public.job_notes;
create policy "Users can update notes for their jobs" on public.job_notes
  for update using (
    exists (
      select 1 from public.jobs 
      where jobs.id = job_notes.job_id 
      and jobs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete notes for their jobs" on public.job_notes;
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

drop trigger if exists handle_jobs_updated_at on public.jobs;
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

-- =============================================================================
-- source: supabase-jobs-tags-schema.sql
-- =============================================================================

-- Add tags column to jobs table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index if not exists for tag filtering
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.jobs.tags IS 'Array of tags for organizing and filtering jobs';

-- =============================================================================
-- source: supabase-linking-schema.sql
-- =============================================================================

-- Linking schema: Connect estimates, jobs, and invoices
-- This creates relationships between estimates → jobs → invoices

-- Add estimate_id to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

-- Add estimate_id to invoices table (for direct linking)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

-- Add job_id to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_estimate_id ON public.jobs(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate_id ON public.invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.estimate_id IS 'Links job to the estimate that created it';
COMMENT ON COLUMN public.invoices.estimate_id IS 'Links invoice directly to the estimate it was created from';
COMMENT ON COLUMN public.invoices.job_id IS 'Links invoice to the job it was created from';

-- =============================================================================
-- source: supabase-materials-schema.sql
-- =============================================================================

-- Materials Catalog Schema
-- Run this SQL in your Supabase SQL Editor to create the materials table

-- Create the materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  unit text DEFAULT 'unit',
  default_price numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts if running multiple times)
DROP POLICY IF EXISTS "Users can view their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can insert their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.materials;

-- RLS Policies for materials
drop policy if exists "Users can view their own materials" on public.materials;
create policy "Users can view their own materials"
  on public.materials FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own materials" on public.materials;
create policy "Users can insert their own materials"
  on public.materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own materials" on public.materials;
create policy "Users can update their own materials"
  on public.materials FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "Users can delete their own materials" on public.materials;
create policy "Users can delete their own materials"
  on public.materials FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_materials_updated_at ON public.materials;

-- Create trigger to update updated_at (use PROCEDURE for compatibility)
drop trigger if exists handle_materials_updated_at on public.materials;
create trigger handle_materials_updated_at
  BEFORE UPDATE on public.materials
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.materials IS 'Catalog of materials/services for quick selection in estimates';
COMMENT ON COLUMN public.materials.category IS 'Category for grouping materials (e.g., "Labor", "Materials", "Equipment")';
COMMENT ON COLUMN public.materials.default_price IS 'Default unit price for this material/service';

-- =============================================================================
-- source: supabase-materials-images-schema.sql
-- =============================================================================

-- Add image_url column to materials table
-- Run this SQL in your Supabase SQL Editor

-- Add image_url column if it doesn't exist
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for documentation
COMMENT ON COLUMN public.materials.image_url IS 'URL to the material image stored in Supabase Storage';

-- =============================================================================
-- source: supabase-storage-materials-policies.sql
-- =============================================================================

-- Storage Bucket Policies for Materials
-- Run this in Supabase SQL Editor after creating the 'materials' bucket

-- First, ensure the bucket exists (if not, create it via Dashboard)
-- Then run these policies

-- Policy: Allow authenticated users to upload files
drop policy if exists "Allow authenticated users to upload materials" on storage.objects;
create policy "Allow authenticated users to upload materials"
on storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to read their own files
drop policy if exists "Allow authenticated users to read their materials" on storage.objects;
create policy "Allow authenticated users to read their materials"
on storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own files
drop policy if exists "Allow authenticated users to update their materials" on storage.objects;
create policy "Allow authenticated users to update their materials"
on storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own files
drop policy if exists "Allow authenticated users to delete their materials" on storage.objects;
create policy "Allow authenticated users to delete their materials"
on storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Alternative: If you want the bucket to be public (anyone can read, but only authenticated users can upload)
-- Uncomment these policies and comment out the read policy above:

-- CREATE POLICY "Allow public read access to materials"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'materials');

-- =============================================================================
-- source: supabase-tasks-schema.sql
-- =============================================================================

-- Tasks schema
-- Tasks are action items tied to jobs and clients, organized by tags

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed', 'Cancelled')),
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date timestamptz,
  tags text[],
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  assigned_to text, -- Can be a team member name or user reference
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
  on public.tasks FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
  on public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON public.tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Updated_at trigger
drop trigger if exists handle_tasks_updated_at on public.tasks;
create trigger handle_tasks_updated_at
  BEFORE UPDATE on public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.tasks IS 'Action items and tasks tied to jobs and clients, organized by tags';
COMMENT ON COLUMN public.tasks.tags IS 'Array of tags for organizing and filtering tasks';
COMMENT ON COLUMN public.tasks.client_id IS 'Optional link to a client';
COMMENT ON COLUMN public.tasks.job_id IS 'Optional link to a job';

-- =============================================================================
-- source: supabase-team-schema.sql
-- =============================================================================

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

drop policy if exists "Enable read own team members" on public.team_members;
create policy "Enable read own team members" on public.team_members
  for select using (auth.uid() = user_id);

drop policy if exists "Enable insert own team members" on public.team_members;
create policy "Enable insert own team members" on public.team_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "Enable update own team members" on public.team_members;
create policy "Enable update own team members" on public.team_members
  for update using (auth.uid() = user_id);

drop policy if exists "Enable delete own team members" on public.team_members;
create policy "Enable delete own team members" on public.team_members
  for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_status on public.team_members(status);
create index if not exists idx_team_members_role on public.team_members(role);

-- Updated_at trigger
drop trigger if exists team_members_updated_at on public.team_members;
create trigger team_members_updated_at
before update on public.team_members
for each row execute procedure public.handle_updated_at();

-- =============================================================================
-- source: supabase-automations-schema.sql
-- =============================================================================

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

drop trigger if exists automations_updated_at on public.automations;
create trigger automations_updated_at
before update on public.automations
for each row execute function public.handle_updated_at();

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
before update on public.email_templates
for each row execute function public.handle_updated_at();

-- RLS
alter table public.automations enable row level security;
alter table public.email_templates enable row level security;
alter table public.automation_runs enable row level security;

-- Policies: users can manage their own rows
drop policy if exists "Enable read own automations" on public.automations;
create policy "Enable read own automations" on public.automations
for select using (auth.uid() = user_id);
drop policy if exists "Enable insert own automations" on public.automations;
create policy "Enable insert own automations" on public.automations
for insert with check (auth.uid() = user_id);
drop policy if exists "Enable update own automations" on public.automations;
create policy "Enable update own automations" on public.automations
for update using (auth.uid() = user_id);
drop policy if exists "Enable delete own automations" on public.automations;
create policy "Enable delete own automations" on public.automations
for delete using (auth.uid() = user_id);

drop policy if exists "Enable read own email templates" on public.email_templates;
create policy "Enable read own email templates" on public.email_templates
for select using (auth.uid() = user_id);
drop policy if exists "Enable insert own email templates" on public.email_templates;
create policy "Enable insert own email templates" on public.email_templates
for insert with check (auth.uid() = user_id);
drop policy if exists "Enable update own email templates" on public.email_templates;
create policy "Enable update own email templates" on public.email_templates
for update using (auth.uid() = user_id);
drop policy if exists "Enable delete own email templates" on public.email_templates;
create policy "Enable delete own email templates" on public.email_templates
for delete using (auth.uid() = user_id);

drop policy if exists "Enable read own automation runs" on public.automation_runs;
create policy "Enable read own automation runs" on public.automation_runs
for select using (auth.uid() = user_id);
drop policy if exists "Enable insert own automation runs" on public.automation_runs;
create policy "Enable insert own automation runs" on public.automation_runs
for insert with check (auth.uid() = user_id);
-- no update/delete on runs for now

-- Helpful indexes
create index if not exists idx_automations_user_active on public.automations(user_id, is_active);
create index if not exists idx_automations_trigger on public.automations(trigger_event);
create index if not exists idx_automation_runs_user on public.automation_runs(user_id);

-- =============================================================================
-- source: supabase-subscriptions-schema.sql
-- =============================================================================

-- Create subscriptions table to track user subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL, -- active, canceled, past_due, trialing, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index if not exists for faster lookups
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own subscriptions
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
create policy "Users can insert own subscriptions"
  on public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
drop policy if exists "Users can update own subscriptions" on public.subscriptions;
create policy "Users can update own subscriptions"
  on public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
-- Note: This is handled by using service role key in API routes

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at
  BEFORE UPDATE on public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- source: supabase-subscriptions-fix.sql
-- =============================================================================

-- Fix subscriptions table: Add UNIQUE constraint on user_id
-- This allows the upsert with onConflict: 'user_id' to work correctly

-- First, check if there are any duplicate user_ids (there shouldn't be, but let's be safe)
-- If you see any duplicates, you'll need to resolve them first

-- Add UNIQUE constraint on user_id
-- If the constraint already exists, this will fail gracefully with IF NOT EXISTS
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_user_id_unique'
  ) then
    alter table public.subscriptions add constraint subscriptions_user_id_unique unique (user_id);
  end if;
end $$;

-- Verify the constraint was added
-- You can check this in Supabase Table Editor → subscriptions → Constraints

-- =============================================================================
-- source: supabase-stripe-webhook-events.sql
-- =============================================================================

-- Idempotency table for Stripe webhooks (run once in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (webhook handler) should access this table.

-- =============================================================================
-- source: supabase-affiliates-schema.sql
-- =============================================================================

-- Affiliates/Referrals schema
-- Tracks user referrals and affiliate earnings

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- The user who referred this user
  referral_code text NOT NULL UNIQUE, -- Unique referral code for each user
  total_referrals integer DEFAULT 0, -- Total number of users referred
  total_earnings numeric(12,2) DEFAULT 0, -- Total earnings from referrals
  commission_rate numeric(5,2) DEFAULT 30.00, -- Commission percentage (default 30%)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who made the referral
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who was referred
  referral_code text NOT NULL, -- The code that was used
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Converted', 'Cancelled')),
  subscription_value numeric(12,2) DEFAULT 0, -- Value of the subscription
  commission_earned numeric(12,2) DEFAULT 0, -- Commission earned from this referral
  commission_paid boolean DEFAULT false, -- Whether commission has been paid
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  converted_at timestamptz, -- When the referral converted to a paying customer
  UNIQUE(referred_user_id) -- A user can only be referred once
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
drop policy if exists "Users can view their own affiliate record" on public.affiliates;
create policy "Users can view their own affiliate record"
  on public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can view referrer's affiliate record if they were referred by them" on public.affiliates;
create policy "Users can view referrer's affiliate record if they were referred by them"
  on public.affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals 
      WHERE referrals.referred_user_id = auth.uid() 
      AND referrals.referrer_id = affiliates.user_id
    )
  );

drop policy if exists "Users can insert their own affiliate record" on public.affiliates;
create policy "Users can insert their own affiliate record"
  on public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own affiliate record" on public.affiliates;
create policy "Users can update their own affiliate record"
  on public.affiliates FOR UPDATE
  USING (auth.uid() = user_id);

-- Referrals policies
drop policy if exists "Users can view referrals they made" on public.referrals;
create policy "Users can view referrals they made"
  on public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

drop policy if exists "Users can view referrals where they were referred" on public.referrals;
create policy "Users can view referrals where they were referred"
  on public.referrals FOR SELECT
  USING (auth.uid() = referred_user_id);

drop policy if exists "System can insert referrals" on public.referrals;
create policy "System can insert referrals"
  on public.referrals FOR INSERT
  WITH CHECK (true); -- Will be controlled by application logic

drop policy if exists "Users can update referrals they made" on public.referrals;
create policy "Users can update referrals they made"
  on public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Updated_at triggers
drop trigger if exists handle_affiliates_updated_at on public.affiliates;
create trigger handle_affiliates_updated_at
  BEFORE UPDATE on public.affiliates
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

drop trigger if exists handle_referrals_updated_at on public.referrals;
create trigger handle_referrals_updated_at
  BEFORE UPDATE on public.referrals
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.affiliates WHERE referral_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.affiliates IS 'Affiliate program records for users';
COMMENT ON TABLE public.referrals IS 'Tracks individual referrals and commissions';
COMMENT ON COLUMN public.affiliates.commission_rate IS 'Commission percentage (e.g., 30.00 for 30%)';
COMMENT ON COLUMN public.referrals.status IS 'Pending: Referred but not subscribed, Active: Subscribed, Converted: Paying customer, Cancelled: Referral cancelled';

-- =============================================================================
-- source: supabase-affiliates-rls-fix.sql
-- =============================================================================

-- Tighten referrals INSERT policy (run in Supabase SQL Editor)
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;

drop policy if exists "Users can insert referrals for themselves as referrer" on referrals;
create policy "Users can insert referrals for themselves as referrer"
  on referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- =============================================================================
-- source: supabase-ai-estimates-schema.sql
-- =============================================================================

-- AI Estimates Schema
-- Run this SQL in your Supabase SQL Editor to enable the AI Estimate feature.
--
-- Creates two tables:
--   1. ai_estimate_sessions  - one row per AI photo-to-estimate session.
--      Tracks photos, contractor context, detected items, and the final
--      estimate it was converted to (if any).
--   2. ai_estimate_usage     - monthly per-user counter used to enforce
--      plan quotas (Starter 5/mo, Pro 100/mo, Enterprise unlimited).
--
-- Also creates a private Supabase Storage bucket `ai-estimates` (must be
-- created from the Storage UI or via the Storage admin API — bucket creation
-- is not possible from SQL).

----------------------------------------------------------------------------
-- 1. ai_estimate_sessions
----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_estimate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lifecycle: analyzing -> ready -> converted, or -> abandoned (cron cleanup)
  status text NOT NULL DEFAULT 'analyzing'
    CHECK (status IN ('analyzing', 'ready', 'converted', 'abandoned', 'error')),

  -- Storage URLs (signed or path-encoded) for the uploaded contractor photos.
  photo_urls text[] NOT NULL DEFAULT '{}',

  -- Contractor-provided context for the AI: trade, sqft, labor, markup, notes.
  -- Free-form jsonb so we can evolve the shape without migrations.
  context jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Output of the vision + catalog-match pipeline. Array of EnrichedLineItem.
  detected_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Error envelope when status='error' (provider, code, message). Null otherwise.
  error jsonb,

  -- Set when the session is finalized into a real estimate.
  final_estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_estimate_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_estimate_sessions_select_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_insert_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_update_own" ON public.ai_estimate_sessions;
DROP POLICY IF EXISTS "ai_estimate_sessions_delete_own" ON public.ai_estimate_sessions;

drop policy if exists "ai_estimate_sessions_select_own" on public.ai_estimate_sessions;
create policy "ai_estimate_sessions_select_own"
  on public.ai_estimate_sessions FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "ai_estimate_sessions_insert_own" on public.ai_estimate_sessions;
create policy "ai_estimate_sessions_insert_own"
  on public.ai_estimate_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "ai_estimate_sessions_update_own" on public.ai_estimate_sessions;
create policy "ai_estimate_sessions_update_own"
  on public.ai_estimate_sessions FOR UPDATE
  USING (auth.uid() = user_id);

drop policy if exists "ai_estimate_sessions_delete_own" on public.ai_estimate_sessions;
create policy "ai_estimate_sessions_delete_own"
  on public.ai_estimate_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_user_id
  ON public.ai_estimate_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_status_created_at
  ON public.ai_estimate_sessions(status, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_sessions_final_estimate_id
  ON public.ai_estimate_sessions(final_estimate_id)
  WHERE final_estimate_id IS NOT NULL;

DROP TRIGGER IF EXISTS handle_ai_estimate_sessions_updated_at
  ON public.ai_estimate_sessions;

drop trigger if exists handle_ai_estimate_sessions_updated_at on public.ai_estimate_sessions;
create trigger handle_ai_estimate_sessions_updated_at
  BEFORE UPDATE on public.ai_estimate_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

COMMENT ON TABLE public.ai_estimate_sessions IS
  'One row per AI photo-to-estimate session. Tracks photos, contractor context, vision output, and the final estimate it was converted to (if any).';
COMMENT ON COLUMN public.ai_estimate_sessions.status IS
  'Lifecycle: analyzing -> ready -> converted, or -> abandoned (90-day cron cleanup), or -> error.';
COMMENT ON COLUMN public.ai_estimate_sessions.context IS
  'Contractor-supplied context: { trade, sqft, labor_hours, labor_rate, markup_pct, notes, client_id, lead_id }.';
COMMENT ON COLUMN public.ai_estimate_sessions.detected_items IS
  'Enriched line items returned by the vision + catalog-match pipeline.';

----------------------------------------------------------------------------
-- 2. ai_estimate_usage
----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_estimate_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- e.g. '2026-05'. Quotas reset on the 1st of each calendar month (UTC).
  year_month text NOT NULL,

  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, year_month)
);

ALTER TABLE public.ai_estimate_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_estimate_usage_select_own" ON public.ai_estimate_usage;
DROP POLICY IF EXISTS "ai_estimate_usage_insert_own" ON public.ai_estimate_usage;
DROP POLICY IF EXISTS "ai_estimate_usage_update_own" ON public.ai_estimate_usage;

drop policy if exists "ai_estimate_usage_select_own" on public.ai_estimate_usage;
create policy "ai_estimate_usage_select_own"
  on public.ai_estimate_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates only happen via the service-role server route, but we still
-- want the policy in place so RLS is not silently bypassable from clients.
drop policy if exists "ai_estimate_usage_insert_own" on public.ai_estimate_usage;
create policy "ai_estimate_usage_insert_own"
  on public.ai_estimate_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "ai_estimate_usage_update_own" on public.ai_estimate_usage;
create policy "ai_estimate_usage_update_own"
  on public.ai_estimate_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_usage_user_year_month
  ON public.ai_estimate_usage(user_id, year_month);

COMMENT ON TABLE public.ai_estimate_usage IS
  'Monthly per-user counter of AI estimate sessions, used to enforce plan quotas.';
COMMENT ON COLUMN public.ai_estimate_usage.year_month IS
  'Calendar month in YYYY-MM format (UTC). Quotas reset on the 1st each month.';

----------------------------------------------------------------------------
-- 3. Storage bucket reminder
----------------------------------------------------------------------------
--
-- Create a PRIVATE bucket named `ai-estimates` from Supabase Dashboard
-- (Storage -> New bucket -> name: ai-estimates, public: OFF).
--
-- Then apply these storage RLS policies in Supabase Storage > Policies for
-- the bucket so that each user can only access photos under their own UUID
-- prefix:
--
--   -- SELECT
--   CREATE POLICY "ai_estimates_read_own"
--     ON storage.objects FOR SELECT
--     USING (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   -- INSERT
--   CREATE POLICY "ai_estimates_insert_own"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   -- DELETE (used by the abandoned-photo cleanup cron and by the user via
--   -- the wizard's "remove photo" button)
--   CREATE POLICY "ai_estimates_delete_own"
--     ON storage.objects FOR DELETE
--     USING (
--       bucket_id = 'ai-estimates'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );

-- =============================================================================
-- source: supabase-orgs-schema.sql
-- =============================================================================

-- Organization-centric multi-tenancy (Jobber-style)
-- Run in Supabase SQL editor after existing schemas.

-- =============================================================================
-- Core org tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_user_id);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker'
    CHECK (role IN ('owner', 'admin', 'manager', 'worker')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(org_id);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker'
    CHECK (role IN ('admin', 'manager', 'worker')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);

-- Client assignments (workers see assigned clients only)
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_assignments_member ON public.client_assignments(member_user_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_org ON public.client_assignments(org_id);

-- =============================================================================
-- Extend user_profiles
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS persona TEXT DEFAULT 'contractor',
      ADD COLUMN IF NOT EXISTS active_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_profiles_persona_check'
    ) THEN
      ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_persona_check
        CHECK (persona IN ('contractor', 'client'));
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Add organization_id to business tables (skip tables not yet created)
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'tasks', 'materials', 'pipeline_stages', 'client_folders',
    'automations', 'email_templates', 'automation_runs',
    'team_members', 'ai_estimate_sessions', 'ai_estimate_usage'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_organization_id ON public.%I(organization_id)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN IF NOT EXISTS organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS seat_quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS included_seats INTEGER DEFAULT 1;
  END IF;
END $$;

-- =============================================================================
-- RLS helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_org_role(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = auth.uid() AND org_id = p_org_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND org_id = p_org_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager_or_above(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = p_org_id
      AND status = 'active'
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = p_org_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

-- =============================================================================
-- Backfill: one org per existing contractor user
-- =============================================================================

INSERT INTO public.organizations (id, name, slug, owner_user_id)
SELECT
  gen_random_uuid(),
  COALESCE(up.company_name, up.full_name, 'My Company'),
  'org-' || substr(replace(u.id::text, '-', ''), 1, 12),
  u.id
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.user_id = u.id AND om.role = 'owner'
)
ON CONFLICT DO NOTHING;

-- Link owners to orgs (for users who got orgs above)
INSERT INTO public.organization_members (org_id, user_id, role, status)
SELECT o.id, o.owner_user_id, 'owner', 'active'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.org_id = o.id AND om.user_id = o.owner_user_id
);

-- Backfill organization_id on all tenant tables from user_id (skip missing tables)
DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'tasks', 'materials', 'pipeline_stages', 'client_folders',
    'automations', 'email_templates', 'automation_runs',
    'team_members', 'ai_estimate_sessions', 'ai_estimate_usage'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        $sql$
          UPDATE public.%1$I tbl
          SET organization_id = om.org_id
          FROM public.organization_members om
          WHERE tbl.user_id = om.user_id
            AND om.role = 'owner'
            AND om.status = 'active'
            AND tbl.organization_id IS NULL
        $sql$,
        t
      );
    END IF;
  END LOOP;
END $$;

-- Backfill subscriptions.organization_id from owner membership
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    UPDATE public.subscriptions s
    SET organization_id = om.org_id
    FROM public.organization_members om
    WHERE s.user_id = om.user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND s.organization_id IS NULL;
  END IF;
END $$;

-- Set active_org_id on profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    UPDATE public.user_profiles up
    SET active_org_id = om.org_id
    FROM public.organization_members om
    WHERE up.user_id = om.user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND up.active_org_id IS NULL;
  END IF;
END $$;

-- =============================================================================
-- RLS on org tables
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
drop policy if exists "Members can view their orgs" on public.organizations;
create policy "Members can view their orgs" on public.organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids()));

DROP POLICY IF EXISTS "Owners can update their orgs" ON public.organizations;
drop policy if exists "Owners can update their orgs" on public.organizations;
create policy "Owners can update their orgs" on public.organizations
  FOR UPDATE USING (public.is_org_admin(id));

DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
drop policy if exists "Members can view org memberships" on public.organization_members;
create policy "Members can view org memberships" on public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.user_org_ids())
  );

-- Must use SECURITY DEFINER helpers — querying organization_members inside its
-- own policy causes infinite recursion and breaks /api/clients (403).
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.organization_members;
drop policy if exists "Admins can manage memberships" on public.organization_members;
create policy "Admins can manage memberships" on public.organization_members
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.organization_invitations;
drop policy if exists "Admins can manage invitations" on public.organization_invitations;
create policy "Admins can manage invitations" on public.organization_invitations
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.organization_invitations;
drop policy if exists "Anyone can read invitation by token" on public.organization_invitations;
create policy "Anyone can read invitation by token" on public.organization_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can manage client assignments" ON public.client_assignments;
drop policy if exists "Managers can manage client assignments" on public.client_assignments;
create policy "Managers can manage client assignments" on public.client_assignments
  FOR ALL USING (public.is_org_manager_or_above(org_id));

DROP POLICY IF EXISTS "Workers can view own client assignments" ON public.client_assignments;
drop policy if exists "Workers can view own client assignments" on public.client_assignments;
create policy "Workers can view own client assignments" on public.client_assignments
  FOR SELECT USING (member_user_id = auth.uid());

-- =============================================================================
-- Dual RLS on tenant tables (user_id OR organization_id during transition)
-- Apply to clients as template — repeat pattern for other tables in app code
-- =============================================================================

-- Clients: add org-scoped policies alongside existing user policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    DROP POLICY IF EXISTS "Org members can read clients" ON public.clients;
    drop policy if exists "Org members can read clients" on public.clients;
create policy "Org members can read clients" on public.clients
      FOR SELECT USING (
        organization_id IN (SELECT public.user_org_ids())
        AND (
          public.is_org_manager_or_above(organization_id)
          OR EXISTS (
            SELECT 1 FROM public.client_assignments ca
            WHERE ca.client_id = clients.id AND ca.member_user_id = auth.uid()
          )
          OR public.user_org_role(organization_id) = 'owner'
          OR public.user_org_role(organization_id) IN ('admin', 'manager')
        )
      );

    DROP POLICY IF EXISTS "Org managers can insert clients" ON public.clients;
    drop policy if exists "Org managers can insert clients" on public.clients;
create policy "Org managers can insert clients" on public.clients
      FOR INSERT WITH CHECK (public.is_org_manager_or_above(organization_id));

    DROP POLICY IF EXISTS "Org managers can update clients" ON public.clients;
    drop policy if exists "Org managers can update clients" on public.clients;
create policy "Org managers can update clients" on public.clients
      FOR UPDATE USING (public.is_org_manager_or_above(organization_id));

    DROP POLICY IF EXISTS "Org managers can delete clients" ON public.clients;
    drop policy if exists "Org managers can delete clients" on public.clients;
create policy "Org managers can delete clients" on public.clients
      FOR DELETE USING (public.is_org_manager_or_above(organization_id));
  END IF;
END $$;

-- Subscriptions: org members can view org subscription
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    DROP POLICY IF EXISTS "Org members can view org subscription" ON public.subscriptions;
    drop policy if exists "Org members can view org subscription" on public.subscriptions;
create policy "Org members can view org subscription" on public.subscriptions
      FOR SELECT USING (
        organization_id IN (SELECT public.user_org_ids())
        OR auth.uid() = user_id
      );
  END IF;
END $$;

-- Job assignments: workers can see their own assignments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'job_assignments'
  ) THEN
    DROP POLICY IF EXISTS "Workers can view own job assignments" ON public.job_assignments;
    drop policy if exists "Workers can view own job assignments" on public.job_assignments;
create policy "Workers can view own job assignments" on public.job_assignments
      FOR SELECT USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Org managers can manage job assignments" ON public.job_assignments;
    drop policy if exists "Org managers can manage job assignments" on public.job_assignments;
create policy "Org managers can manage job assignments" on public.job_assignments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = job_assignments.job_id
            AND public.is_org_manager_or_above(j.organization_id)
        )
      );
  END IF;
END $$;

-- =============================================================================
-- source: supabase-org-rls-recursion-fix.sql
-- =============================================================================

-- Fix infinite RLS recursion on organization_members.
-- The old "Admins can manage memberships" policy queried organization_members
-- from within itself, which made membership SELECTs fail and caused
-- GET /api/clients → 403 "No organization membership found".
-- Run once in Supabase SQL Editor if not already applied.

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = p_org_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Owners can update their orgs" ON public.organizations;
drop policy if exists "Owners can update their orgs" on public.organizations;
create policy "Owners can update their orgs" on public.organizations
  FOR UPDATE USING (public.is_org_admin(id));

DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
drop policy if exists "Members can view org memberships" on public.organization_members;
create policy "Members can view org memberships" on public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.user_org_ids())
  );

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.organization_members;
drop policy if exists "Admins can manage memberships" on public.organization_members;
create policy "Admins can manage memberships" on public.organization_members
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.organization_invitations;
drop policy if exists "Admins can manage invitations" on public.organization_invitations;
create policy "Admins can manage invitations" on public.organization_invitations
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- =============================================================================
-- source: supabase-portal-schema.sql
-- =============================================================================

-- Client portal: service requests, messaging (Jobber Client Hub)
-- Run after supabase-orgs-schema.sql

CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'disabled')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_users_auth ON public.client_portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_client ON public.client_portal_users(client_id);

CREATE TABLE IF NOT EXISTS public.client_portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_invitations_token ON public.client_portal_invitations(token);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_user_id UUID REFERENCES public.client_portal_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  preferred_date DATE,
  photos JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'quoted', 'scheduled', 'declined', 'archived')),
  converted_estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  converted_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_org ON public.service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contractor', 'client')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- RLS
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Portal users: clients see own row; org managers see their org's portal users
drop policy if exists "Portal users read own" on public.client_portal_users;
create policy "Portal users read own" on public.client_portal_users
  FOR SELECT USING (auth_user_id = auth.uid());

drop policy if exists "Org managers view portal users" on public.client_portal_users;
create policy "Org managers view portal users" on public.client_portal_users
  FOR SELECT USING (organization_id IN (SELECT public.user_org_ids()));

drop policy if exists "Org managers manage portal users" on public.client_portal_users;
create policy "Org managers manage portal users" on public.client_portal_users
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

-- Service requests
drop policy if exists "Clients view own requests" on public.service_requests;
create policy "Clients view own requests" on public.service_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = service_requests.client_id
        AND cpu.status = 'active'
    )
  );

drop policy if exists "Clients create requests" on public.service_requests;
create policy "Clients create requests" on public.service_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = service_requests.client_id
        AND cpu.organization_id = service_requests.organization_id
        AND cpu.status = 'active'
    )
  );

drop policy if exists "Org members view requests" on public.service_requests;
create policy "Org members view requests" on public.service_requests
  FOR SELECT USING (organization_id IN (SELECT public.user_org_ids()));

drop policy if exists "Org managers manage requests" on public.service_requests;
create policy "Org managers manage requests" on public.service_requests
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

-- Conversations
drop policy if exists "Participants view conversations" on public.conversations;
create policy "Participants view conversations" on public.conversations
  FOR SELECT USING (
    organization_id IN (SELECT public.user_org_ids())
    OR EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = conversations.client_id
        AND cpu.status = 'active'
    )
  );

drop policy if exists "Participants create conversations" on public.conversations;
create policy "Participants create conversations" on public.conversations
  FOR INSERT WITH CHECK (
    public.is_org_manager_or_above(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = conversations.client_id
        AND cpu.status = 'active'
    )
  );

-- Messages
drop policy if exists "Participants view messages" on public.messages;
create policy "Participants view messages" on public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.organization_id IN (SELECT public.user_org_ids())
          OR EXISTS (
            SELECT 1 FROM public.client_portal_users cpu
            WHERE cpu.auth_user_id = auth.uid()
              AND cpu.client_id = c.client_id
              AND cpu.status = 'active'
          )
        )
    )
  );

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages" on public.messages
  FOR INSERT WITH CHECK (
    sender_auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.organization_id IN (SELECT public.user_org_ids())
          OR EXISTS (
            SELECT 1 FROM public.client_portal_users cpu
            WHERE cpu.auth_user_id = auth.uid()
              AND cpu.client_id = c.client_id
              AND cpu.status = 'active'
          )
        )
    )
  );

-- Portal invitations
drop policy if exists "Org managers manage portal invitations" on public.client_portal_invitations;
create policy "Org managers manage portal invitations" on public.client_portal_invitations
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

drop policy if exists "Public read portal invitation by token" on public.client_portal_invitations;
create policy "Public read portal invitation by token" on public.client_portal_invitations
  FOR SELECT USING (true);

-- Enable realtime for messages
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
