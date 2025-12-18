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
CREATE POLICY "Users can view their own pipeline stages"
  ON public.pipeline_stages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pipeline stages"
  ON public.pipeline_stages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pipeline stages"
  ON public.pipeline_stages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pipeline stages"
  ON public.pipeline_stages FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user_id ON public.pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(user_id, position);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_pipeline_stages_updated_at ON public.pipeline_stages;

-- Create trigger to update updated_at
CREATE TRIGGER handle_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.pipeline_stages IS 'Customizable pipeline stages for sales pipeline';
COMMENT ON COLUMN public.pipeline_stages.position IS 'Order/position of the stage in the pipeline';
COMMENT ON COLUMN public.pipeline_stages.color IS 'Hex color code for the stage';

-- Insert default stages for existing users (optional - can be done via API on first load)
-- This is handled by the API route on first access


