-- RLS policies for Core Commerce tables
-- Categories, Products, Orders, Customers

-- 1. CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow merchants to see their own categories
CREATE POLICY "categories_select_own"
  ON public.categories FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow merchants to insert their own categories
CREATE POLICY "categories_insert_own"
  ON public.categories FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow merchants to update their own categories
CREATE POLICY "categories_update_own"
  ON public.categories FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow merchants to delete their own categories
CREATE POLICY "categories_delete_own"
  ON public.categories FOR DELETE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public read for storefront
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE status = 'live' AND is_disabled = false)
    OR store_id IN (SELECT id FROM public.stores WHERE status = 'building') -- Allow preview
  );


-- 2. PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_own"
  ON public.products FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (
    active = true AND 
    store_id IN (SELECT id FROM public.stores WHERE status IN ('live', 'building') AND is_disabled = false)
  );
