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
CREATE POLICY "Users can view their own folders"
  ON public.client_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
  ON public.client_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.client_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.client_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_folders_user_id ON public.client_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_folder_id ON public.clients(folder_id);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON public.clients USING GIN(tags);

-- Create trigger to update updated_at for client_folders
CREATE TRIGGER handle_client_folders_updated_at
  BEFORE UPDATE ON public.client_folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Comments for documentation
COMMENT ON COLUMN public.clients.tags IS 'Array of tags for organizing clients (e.g., ["Residential", "High Priority"])';
COMMENT ON COLUMN public.clients.folder_id IS 'Reference to the folder this client belongs to';
COMMENT ON TABLE public.client_folders IS 'Custom folders for organizing clients';


