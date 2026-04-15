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

    let query = supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true);

    if (isUuid) {
      query = query.eq("id", productIdOrSlug);
    } else {
      query = query.eq("slug", productIdOrSlug);
    }

    const { data: product, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

    if (!product) {
      return NextResponse.json({ 
        error: { 
          code: "NOT_FOUND", 
          message: "Product not found" 
        } 
      }, { status: 404 });
    }

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
