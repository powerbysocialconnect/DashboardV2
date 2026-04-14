-- Additive migration: extend store_provisioning_jobs
-- SAFE: uses ADD COLUMN IF NOT EXISTS — will not affect existing data or columns

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS job_type text;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'queued';

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS result jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.store_provisioning_jobs
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_store_provisioning_jobs_status
  ON public.store_provisioning_jobs(status);
