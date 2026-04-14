-- RLS policies for Shipping Methods
-- Ensure storefront can read shipping methods and merchants can manage them

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

-- 1. Public read for storefront (customers)
CREATE POLICY "shipping_methods_public_read"
  ON public.shipping_methods FOR SELECT
  USING (
    active = true AND 
    store_id IN (SELECT id FROM public.stores WHERE status IN ('live', 'building') AND is_disabled = false)
  );

-- 2. Merchant management (CRUD)
CREATE POLICY "shipping_methods_merchant_all"
  ON public.shipping_methods FOR ALL
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
