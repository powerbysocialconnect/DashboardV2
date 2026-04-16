-- Migration to support multiple categories per product
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Owners can manage their own product-category links
CREATE POLICY "product_categories_owner_all"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM public.products 
      WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    )
  );

-- RLS Policy: Public read access
CREATE POLICY "product_categories_public_read"
  ON public.product_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Migrate existing single category_id data to the new table
INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id 
FROM public.products 
WHERE category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;
