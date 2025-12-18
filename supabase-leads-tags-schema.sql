-- Add tags column to leads table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index for tag filtering
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.leads.tags IS 'Array of tags for organizing and filtering leads';


