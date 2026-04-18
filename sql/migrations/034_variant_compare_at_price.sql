-- Migration: 034_variant_compare_at_price.sql
-- Description: Add compare_at_price to product_variants table

ALTER TABLE public.product_variants
ADD COLUMN compare_at_price DECIMAL(12,2);
