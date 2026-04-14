-- 016_headless_templates_metadata.sql
-- Add versioning, repository tracking, and bundle paths to V2 headless templates

ALTER TABLE public.headless_templates
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS repository_url TEXT,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bundle_url TEXT,
ADD COLUMN IF NOT EXISTS style_url TEXT;
