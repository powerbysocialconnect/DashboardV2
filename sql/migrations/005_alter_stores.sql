-- Additive migration: add new columns to stores
-- SAFE: uses ADD COLUMN IF NOT EXISTS — will not affect existing data or columns
-- All new columns have defaults so existing rows are unaffected

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS launched_at timestamptz;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS template_source text;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Index on the new status column for filtering
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_trial_ends_at ON public.stores(trial_ends_at);
