-- Add tags column to estimates table
-- Run this SQL in your Supabase SQL Editor

-- Add tags column if it doesn't exist
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create index for tag filtering
CREATE INDEX IF NOT EXISTS idx_estimates_tags ON public.estimates USING GIN(tags);

-- Comment for documentation
COMMENT ON COLUMN public.estimates.tags IS 'Array of tags for organizing and filtering estimates';

