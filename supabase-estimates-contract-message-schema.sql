-- Add contract_message column to estimates table
-- Run this SQL in your Supabase SQL Editor

-- Add contract_message column if it doesn't exist
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS contract_message text;

-- Comment for documentation
COMMENT ON COLUMN public.estimates.contract_message IS 'Custom message/terms to include in the estimate contract';


