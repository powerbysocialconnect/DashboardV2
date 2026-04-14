-- Migration: store_pages
-- Staff-only page management system for per-store custom pages
-- Safe: uses IF NOT EXISTS, will not affect existing tables

-- Page type enum
DO $$ BEGIN
  CREATE TYPE public.page_type AS ENUM ('standard', 'contact', 'faq', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  page_type public.page_type NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  show_in_header boolean NOT NULL DEFAULT false,
  show_in_footer boolean NOT NULL DEFAULT false,
  nav_order integer NOT NULL DEFAULT 0,
  footer_order integer NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_pages_store_id ON public.store_pages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_pages_slug ON public.store_pages(store_id, slug);
CREATE INDEX IF NOT EXISTS idx_store_pages_header ON public.store_pages(store_id, show_in_header) WHERE show_in_header = true;
CREATE INDEX IF NOT EXISTS idx_store_pages_footer ON public.store_pages(store_id, show_in_footer) WHERE show_in_footer = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_store_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_pages_updated_at ON public.store_pages;
CREATE TRIGGER trg_store_pages_updated_at
  BEFORE UPDATE ON public.store_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_store_pages_updated_at();

-- Reserved slug check constraint
-- Prevents slugs that conflict with existing storefront routes
ALTER TABLE public.store_pages DROP CONSTRAINT IF EXISTS chk_store_pages_reserved_slug;
ALTER TABLE public.store_pages ADD CONSTRAINT chk_store_pages_reserved_slug
  CHECK (slug NOT IN (
    'cart', 'checkout', 'product', 'products', 'collections',
    'account', 'admin', 'api', 'login', 'register', 'search',
    '_next', 'favicon', 'store', 'dashboard'
  ));

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "admin_full_access_store_pages" ON public.store_pages;
DROP POLICY IF EXISTS "public_read_published_store_pages" ON public.store_pages;

-- Admin full access: only users with profiles.is_admin = true
CREATE POLICY "admin_full_access_store_pages"
  ON public.store_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Scoped public read: only published pages, scoped by store_id
-- This is used by storefront server-side reads; the query MUST filter by store_id
CREATE POLICY "public_read_published_store_pages"
  ON public.store_pages
  FOR SELECT
  USING (is_published = true);

-- NOTE: Storefront reads should ALWAYS use server-side scoped queries
-- filtered by the resolved store_id from the current domain/subdomain context.
-- The RLS policy allows SELECT only for published pages as a safety net,
-- but the primary access control is through server-side store context resolution.
