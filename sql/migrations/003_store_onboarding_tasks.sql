-- Additive migration: store_onboarding_tasks
-- Checklist items for admin and merchant onboarding flow
-- Safe: uses IF NOT EXISTS, will not affect existing tables

CREATE TABLE IF NOT EXISTS public.store_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  title text NOT NULL,
  description text NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NULL,
  assigned_to uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_store_onboarding_tasks_store_id
  ON public.store_onboarding_tasks(store_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_store_onboarding_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_onboarding_tasks_updated_at ON public.store_onboarding_tasks;
CREATE TRIGGER trg_store_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.store_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_store_onboarding_tasks_updated_at();
