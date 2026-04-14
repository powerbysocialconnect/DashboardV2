-- Additive migration: store_status_history
-- Audit trail for store lifecycle transitions
-- Safe: uses IF NOT EXISTS, will not affect existing tables

CREATE TABLE IF NOT EXISTS public.store_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text NULL,
  changed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_status_history_store_id
  ON public.store_status_history(store_id);

CREATE INDEX IF NOT EXISTS idx_store_status_history_created_at
  ON public.store_status_history(created_at DESC);
