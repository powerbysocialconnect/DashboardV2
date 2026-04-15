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
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .eq("active", true)
      .range(offset, offset + limit - 1);

    // Filter by category
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // Search query
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Sorting
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

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

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
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred while fetching products." 
      } 
    }, { status: 500 });
  }
}
