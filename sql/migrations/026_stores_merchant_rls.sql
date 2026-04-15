-- 026_stores_merchant_rls.sql
-- Merchant dashboard updates `public.stores` (name, description, logo_url, branding, etc.).
-- If RLS is enabled on `stores` without an UPDATE policy for owners, saves affect 0 rows and
-- appear to "do nothing" (no error from PostgREST in some cases).
--
-- Run in Supabase SQL Editor. Safe to re-run (drops policies by these names first).
--
-- Note: Does not run ALTER TABLE ... ENABLE ROW LEVEL SECURITY (your project may
-- already enable it with other policies). These policies apply once RLS is on.

DROP POLICY IF EXISTS "stores_merchant_select_own" ON public.stores;
DROP POLICY IF EXISTS "stores_merchant_update_own" ON public.stores;

-- Read own store (settings page, dashboard)
CREATE POLICY "stores_merchant_select_own"
ON public.stores FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- Update own store (Save Changes on /dashboard/settings)
CREATE POLICY "stores_merchant_update_own"
ON public.stores FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
