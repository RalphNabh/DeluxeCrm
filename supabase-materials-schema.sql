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
CREATE POLICY "Users can view their own materials"
  ON public.materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own materials"
  ON public.materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own materials"
  ON public.materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials"
  ON public.materials FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_materials_updated_at ON public.materials;

-- Create trigger to update updated_at (use PROCEDURE for compatibility)
CREATE TRIGGER handle_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.materials IS 'Catalog of materials/services for quick selection in estimates';
COMMENT ON COLUMN public.materials.category IS 'Category for grouping materials (e.g., "Labor", "Materials", "Equipment")';
COMMENT ON COLUMN public.materials.default_price IS 'Default unit price for this material/service';

