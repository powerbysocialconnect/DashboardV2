-- Additive migration: store_theme_configs
-- Central theme/config layer for store presentation
-- Safe: uses IF NOT EXISTS, will not affect existing tables

CREATE TABLE IF NOT EXISTS public.store_theme_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  theme_code text NOT NULL DEFAULT 'starter',
  theme_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  homepage_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_css text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_theme_configs_store_id
  ON public.store_theme_configs(store_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_store_theme_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_theme_configs_updated_at ON public.store_theme_configs;
CREATE TRIGGER trg_store_theme_configs_updated_at
  BEFORE UPDATE ON public.store_theme_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_store_theme_configs_updated_at();
