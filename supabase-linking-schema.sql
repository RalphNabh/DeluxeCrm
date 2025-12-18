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

