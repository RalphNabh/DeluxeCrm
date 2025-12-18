-- Add image_url column to materials table
-- Run this SQL in your Supabase SQL Editor

-- Add image_url column if it doesn't exist
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for documentation
COMMENT ON COLUMN public.materials.image_url IS 'URL to the material image stored in Supabase Storage';


