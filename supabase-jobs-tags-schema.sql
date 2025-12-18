-- Add tags column to jobs table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index for tag filtering
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.jobs.tags IS 'Array of tags for organizing and filtering jobs';


