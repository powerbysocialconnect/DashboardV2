-- AGGRESSIVE RLS FIX FOR CATEGORIES
-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;

-- Re-enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Unified policy for ALL actions (CRUD) for the OWNER
CREATE POLICY "categories_owner_all"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public read for storefront (everyone)
CREATE POLICY "categories_public_read_v2"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE status IN ('live', 'building') AND is_disabled = false)
  );
