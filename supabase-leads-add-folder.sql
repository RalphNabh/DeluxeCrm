-- Add folder_id column to leads table to support folder organization
-- This allows leads to be organized into folders similar to clients

-- Add folder_id column (nullable, references client_folders)
alter table public.leads
add column if not exists folder_id uuid references public.client_folders(id) on delete set null;

-- Create index for folder filtering
create index if not exists idx_leads_folder_id on public.leads(folder_id);

-- Add comment
comment on column public.leads.folder_id is 'Optional folder assignment for organizing leads';

