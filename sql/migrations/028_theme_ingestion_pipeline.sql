-- 028_theme_ingestion_pipeline.sql
-- Additive schema for real theme package ingestion + versioning.

-- 1) Version table (immutable package records)
CREATE TABLE IF NOT EXISTS public.headless_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.headless_templates(id) ON DELETE CASCADE,
  theme_code TEXT NOT NULL,
  version TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'zip_upload', -- zip_upload | manual | repo_sync
  package_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  blueprint_json JSONB,
  bundle_url TEXT,
  style_url TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | validated | published | archived
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_headless_template_versions_unique_code_version
  ON public.headless_template_versions(theme_code, version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_headless_template_versions_hash
  ON public.headless_template_versions(package_hash);

-- 2) Add version tracking + ingestion metadata on current template record
ALTER TABLE public.headless_templates
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.headless_template_versions(id),
  ADD COLUMN IF NOT EXISTS package_status TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual', -- manual | zip_upload | repo_sync
  ADD COLUMN IF NOT EXISTS package_manifest JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blueprint JSONB;

-- 3) RLS for versions table
ALTER TABLE public.headless_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "headless_template_versions_read_public" ON public.headless_template_versions;
CREATE POLICY "headless_template_versions_read_public"
  ON public.headless_template_versions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR status = 'published'
  );

DROP POLICY IF EXISTS "headless_template_versions_admin_all" ON public.headless_template_versions;
CREATE POLICY "headless_template_versions_admin_all"
  ON public.headless_template_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
