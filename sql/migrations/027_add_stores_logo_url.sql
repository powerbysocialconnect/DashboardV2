-- 027_add_stores_logo_url.sql
-- The dashboard and themes use stores.logo_url; PostgREST errors if the column is missing:
--   "Could not find the 'logo_url' column of 'stores' in the schema cache"
--
-- Run in Supabase SQL Editor (idempotent).

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.stores.logo_url IS 'Public URL for store logo (upload or external image URL).';
