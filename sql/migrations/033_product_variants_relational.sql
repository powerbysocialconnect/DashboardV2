-- Migration: 033_product_variants_relational.sql
-- Description: Implement Shopify-level product variants with relational mapping

-- 1. Create Option Groups Table
CREATE TABLE public.product_option_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Option Values Table
CREATE TABLE public.product_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Product Variants Table
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT,
    price DECIMAL(12,2),
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Variant Options Mapping Table (Many-to-Many)
CREATE TABLE public.product_variant_options (
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES public.product_option_values(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, option_value_id)
);

-- 5. Enable RLS
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies

-- Option Groups
CREATE POLICY "option_groups_select_own" ON public.product_option_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_groups_insert_own" ON public.product_option_groups FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_groups_update_own" ON public.product_option_groups FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_groups_delete_own" ON public.product_option_groups FOR DELETE
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_groups_public_read" ON public.product_option_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND s.status IN ('live', 'building') AND s.is_disabled = false));

-- Option Values
CREATE POLICY "option_values_select_own" ON public.product_option_values FOR SELECT
USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON og.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE og.id = option_group_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_values_insert_own" ON public.product_option_values FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON og.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE og.id = option_group_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_values_update_own" ON public.product_option_values FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON og.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE og.id = option_group_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_values_delete_own" ON public.product_option_values FOR DELETE
USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON og.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE og.id = option_group_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "option_values_public_read" ON public.product_option_values FOR SELECT
USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON og.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE og.id = option_group_id AND s.status IN ('live', 'building') AND s.is_disabled = false));

-- Product Variants
CREATE POLICY "variants_select_own" ON public.product_variants FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variants_insert_own" ON public.product_variants FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variants_update_own" ON public.product_variants FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variants_delete_own" ON public.product_variants FOR DELETE
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variants_public_read" ON public.product_variants FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE p.id = product_id AND s.status IN ('live', 'building') AND s.is_disabled = false));

-- Variant Options
CREATE POLICY "variant_options_select_own" ON public.product_variant_options FOR SELECT
USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON v.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE v.id = variant_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variant_options_insert_own" ON public.product_variant_options FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON v.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE v.id = variant_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variant_options_update_own" ON public.product_variant_options FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON v.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE v.id = variant_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variant_options_delete_own" ON public.product_variant_options FOR DELETE
USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON v.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE v.id = variant_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))));

CREATE POLICY "variant_options_public_read" ON public.product_variant_options FOR SELECT
USING (EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON v.product_id = p.id JOIN public.stores s ON p.store_id = s.id WHERE v.id = variant_id AND s.status IN ('live', 'building') AND s.is_disabled = false));
