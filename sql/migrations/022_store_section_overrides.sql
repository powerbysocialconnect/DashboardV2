-- ============================================================================
-- Migration 022: Store Section Overrides
-- Per-store, per-theme content overrides for homepage sections.
-- Stores ONLY the fields that differ from theme defaults (sparse JSONB).
-- ============================================================================

-- Table
CREATE TABLE IF NOT EXISTS public.store_section_overrides (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  theme_code          text NOT NULL,                          -- scopes overrides to the active theme
  section_type        text NOT NULL,                          -- 'hero', 'featured_products', etc.
  section_index       integer NOT NULL DEFAULT 0,             -- disambiguates multiple sections of same type
  section_instance_id text NULL,                              -- future: stable identity for reordering
  overrides           jsonb NOT NULL DEFAULT '{}'::jsonb,     -- sparse field-level overrides
  is_enabled          boolean NOT NULL DEFAULT true,          -- stores can hide individual sections
  sort_order          integer NULL,                           -- future: per-store section reordering
  is_draft            boolean NOT NULL DEFAULT false,         -- Phase 2: draft/publish workflow
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- One published + one draft row per (store, theme, section, index)
  UNIQUE(store_id, theme_code, section_type, section_index, is_draft)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_section_overrides_store_id
  ON public.store_section_overrides(store_id);

CREATE INDEX IF NOT EXISTS idx_store_section_overrides_lookup
  ON public.store_section_overrides(store_id, theme_code, is_draft);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_store_section_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_section_overrides_updated_at ON public.store_section_overrides;
CREATE TRIGGER trg_store_section_overrides_updated_at
  BEFORE UPDATE ON public.store_section_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_store_section_overrides_updated_at();

-- RLS Policies (admin-managed table)
ALTER TABLE public.store_section_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "admin_full_access_store_section_overrides"
  ON public.store_section_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Store owners can read their own overrides
CREATE POLICY "owner_read_store_section_overrides"
  ON public.store_section_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_section_overrides.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- Service role / anon can read published overrides (for storefront rendering)
CREATE POLICY "anon_read_published_store_section_overrides"
  ON public.store_section_overrides
  FOR SELECT
  USING (is_draft = false);
