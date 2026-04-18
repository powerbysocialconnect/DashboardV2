import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;
  const { searchParams } = new URL(request.url);
  
  const categoryId = searchParams.get("category_id");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") || "latest";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = (page - 1) * limit;

  try {
    // 1. Build the base query
    // We include lightweight variant summaries to derive commerce status without heavy payloads
    let query = supabase
      .from("products")
      .select(`
        id, 
        name, 
        slug, 
        description, 
        price, 
        compare_at_price, 
        image_urls, 
        stock, 
        active, 
        product_categories(category_id),
        product_variants(price, compare_at_price, stock, active)
      `, { count: "exact" })
      .eq("store_id", storeId)
      .eq("active", true);

    // 2. Filter by category
    if (categoryId) {
      // Support BOTH the legacy category_id column and the new multi-category junction table
      query = query.or(`category_id.eq.${categoryId},product_categories.category_id.eq.${categoryId}`);
    }

    // 3. Search query
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // 4. Sorting
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (sort === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      // Default: latest
      query = query.order("created_at", { ascending: false });
    }

    // 5. Apply pagination AFTER all filters
    const { data: rawProducts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("[HEADLESS PRODUCTS ERROR]", error.message);
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

    // 6. Normalize and derive commerce convenience fields
    const products = (rawProducts || []).map((p: any) => {
      const activeVariants = (p.product_variants || []).filter((v: any) => v.active);
      const has_variants = activeVariants.length > 0;
      
      // Mode-aware stock resolution
      const in_stock = has_variants 
        ? activeVariants.some((v: any) => v.stock > 0)
        : (p.stock || 0) > 0;

      // Price range calculation
      let price_min = p.price;
      let price_max = p.price;

      if (has_variants) {
        const prices = activeVariants.map((v: any) => v.price || p.price);
        price_min = Math.min(...prices);
        price_max = Math.max(...prices);
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compare_at_price: p.compare_at_price,
        image_urls: p.image_urls,
        primary_image: p.image_urls?.[0] || null,
        stock: p.stock,
        active: p.active,
        has_variants,
        in_stock,
        price_min,
        price_max,
        // Include lightweight variant count
        variant_count: activeVariants.length
      };
    });

    return NextResponse.json({ 
      products,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (err) {
    console.error("[HEADLESS PRODUCTS CRITICAL ERROR]", err);
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred while fetching products." 
      } 
    }, { status: 500 });
  }
}
