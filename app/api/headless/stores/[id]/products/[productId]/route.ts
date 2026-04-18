import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;
  const productIdOrSlug = params.productId;

  try {
    // Check if it's a UUID or Slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdOrSlug);

    // 1. Build the deep relational query with explicit field selection
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        slug,
        price,
        compare_at_price,
        image_urls,
        stock,
        active,
        product_option_groups(
          id, 
          name, 
          position, 
          product_option_values(id, value)
        ),
        product_variants(
          id, 
          sku, 
          price, 
          compare_at_price, 
          stock, 
          image_url, 
          active, 
          is_default, 
          product_variant_options(option_value_id)
        )
      `)
      .eq("store_id", storeId)
      .eq("active", true);

    if (isUuid) {
      query = query.eq("id", productIdOrSlug);
    } else {
      query = query.eq("slug", productIdOrSlug);
    }

    const { data: rawProduct, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

    if (!rawProduct) {
      return NextResponse.json({ 
        error: { 
          code: "NOT_FOUND", 
          message: "Product not found" 
        } 
      }, { status: 404 });
    }

    // 2. Commerce Logic: Filter for buyable data only
    const activeVariants = (rawProduct.product_variants || []).filter((v: any) => v.active);
    const has_variants = activeVariants.length > 0;

    // Mode-aware stock resolution
    const in_stock = has_variants 
      ? activeVariants.some((v: any) => v.stock > 0)
      : (rawProduct.stock || 0) > 0;

    // 3. Dead Option Pruning
    // Collect all option value IDs that are actually used in active variants
    const usedOptionValueIds = new Set<string>();
    activeVariants.forEach((v: any) => {
      (v.product_variant_options || []).forEach((vo: any) => {
        usedOptionValueIds.add(vo.option_value_id);
      });
    });

    // Prune the option groups to only include values that lead to an active variant
    const prunedOptionGroups = (rawProduct.product_option_groups || [])
      .map((group: any) => ({
        ...group,
        product_option_values: (group.product_option_values || []).filter((val: any) => 
          usedOptionValueIds.has(val.id)
        )
      }))
      .filter((group: any) => group.product_option_values.length > 0)
      .sort((a: any, b: any) => a.position - b.position);

    // 4. Variant Normalization: Inject convenience fields
    const normalizedVariants = activeVariants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      price: v.price || rawProduct.price,
      compare_at_price: v.compare_at_price || rawProduct.compare_at_price,
      stock: v.stock,
      image_url: v.image_url,
      is_default: v.is_default,
      // Map option_value_ids for instant storefront matching
      option_value_ids: (v.product_variant_options || []).map((vo: any) => vo.option_value_id)
    }));

    // Price range calculation
    let price_min = rawProduct.price;
    let price_max = rawProduct.price;
    if (has_variants) {
      const prices = normalizedVariants.map((v: any) => v.price);
      price_min = Math.min(...prices);
      price_max = Math.max(...prices);
    }

    // 5. Final Response Object (The Framework Contract)
    const product = {
      ...rawProduct,
      has_variants,
      in_stock,
      price_min,
      price_max,
      product_option_groups: prunedOptionGroups,
      product_variants: normalizedVariants,
      // Default variant helper
      default_variant_id: normalizedVariants.find((v: any) => v.is_default)?.id || normalizedVariants[0]?.id || null,
      // Deprecation Warnings (Transitional)
      _deprecated: "Legacy JSON fields (colors, sizes, variants) are deprecated. Use product_option_groups and product_variants relational fields."
    };

    return NextResponse.json({ product });
  } catch (err: any) {
    console.error(`[HEADLESS SINGLE PRODUCT ERROR]`, err);
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred" 
      } 
    }, { status: 500 });
  }
}
