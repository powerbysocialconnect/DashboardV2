-- Additive migration: ensure stores.subdomain is unique and indexed
-- SAFE: IF NOT EXISTS guards prevent errors if already applied
-- Existing stores with subdomains are unaffected

-- Ensure the subdomain column exists (it should already — this is a safety net)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subdomain text;

-- Unique index for fast hostname-based lookups and uniqueness enforcement
-- Using a partial index to ignore NULL subdomains (stores that haven't been assigned one yet)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_subdomain_unique
  ON public.stores(subdomain)
  WHERE subdomain IS NOT NULL;

-- Fast lookup index for middleware subdomain resolution
CREATE INDEX IF NOT EXISTS idx_stores_subdomain_lookup
  ON public.stores(subdomain)
  WHERE subdomain IS NOT NULL AND is_disabled = false;
