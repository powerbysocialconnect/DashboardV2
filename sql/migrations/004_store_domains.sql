-- Additive migration: store_domains
-- Custom domain management for stores
-- Safe: uses IF NOT EXISTS, will not affect existing tables

CREATE TABLE IF NOT EXISTS public.store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  is_primary boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'pending',
  ssl_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_domains_store_id
  ON public.store_domains(store_id);

CREATE INDEX IF NOT EXISTS idx_store_domains_domain
  ON public.store_domains(domain);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_store_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_domains_updated_at ON public.store_domains;
CREATE TRIGGER trg_store_domains_updated_at
  BEFORE UPDATE ON public.store_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_store_domains_updated_at();
