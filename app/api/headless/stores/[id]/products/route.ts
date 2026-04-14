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
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
