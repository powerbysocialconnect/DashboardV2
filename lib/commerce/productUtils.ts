import { Product, ProductVariant } from "@/types/database";

/**
 * Determines if a product has active relational variants
 */
export function hasVariants(product: any): boolean {
  if (!product) return false;
  return (product.product_variants && product.product_variants.length > 0);
}

/**
 * Resolves the display price for a product or selected variant
 */
export function resolvePrice(product: any, selectedVariant?: any): number {
  if (!product) return 0;
  if (hasVariants(product)) {
    return selectedVariant?.price ?? product.price;
  }
  return product.price;
}

/**
 * Resolves the compare-at price for a product or selected variant
 */
export function resolveCompareAtPrice(product: any, selectedVariant?: any): number | null {
  if (!product) return null;
  if (hasVariants(product)) {
    return selectedVariant?.compare_at_price ?? product.compare_at_price;
  }
  return product.compare_at_price;
}

/**
 * Resolves the inventory stock for a product or selected variant
 */
export function resolveInventory(product: any, selectedVariant?: any): number {
  if (!product) return 0;
  if (hasVariants(product)) {
    // If variants exist but none selected, we can't reliably return a single stock value,
    // so we return 0 or the sum? Shopify treats them as separate.
    // For resolution purposes, we return the selected variant's stock.
    return selectedVariant?.stock ?? 0;
  }
  return product.stock ?? 0;
}

/**
 * Resolves the featured image for a product or selected variant
 */
export function resolveImage(product: any, selectedVariant?: any): string {
  if (!product) return 'https://via.placeholder.com/1200x1600';
  
  // 1. Specific variant image
  if (selectedVariant?.image_url) {
    return selectedVariant.image_url;
  }
  
  // 2. Fallback to product gallery
  const galleryImage = 
    product.image_urls?.[0] || 
    product.images?.[0]?.url;

  if (galleryImage) return galleryImage;

  // 3. Default fallback
  return "https://via.placeholder.com/1200x1600";
}

/**
 * Resolves the SKU for a product or selected variant
 */
export function resolveSKU(product: any, selectedVariant?: any): string | null {
  if (!product) return null;
  if (hasVariants(product) && selectedVariant?.sku) {
    return selectedVariant.sku;
  }
  return (product as any).sku || null;
}

/**
 * Checks if a product/variant is in stock
 */
export function isInStock(product: any, selectedVariant?: any): boolean {
  return resolveInventory(product, selectedVariant) > 0;
}

/**
 * Checks if a product/variant is sold out
 */
export function isSoldOut(product: any, selectedVariant?: any): boolean {
  return !isInStock(product, selectedVariant);
}

/**
 * Calculates total stock across all variants (useful for dashboard)
 */
export function getTotalVariantStock(product: any): number {
  if (!hasVariants(product)) return product.stock || 0;
  return (product.product_variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
}
