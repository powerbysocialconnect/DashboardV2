import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  try {
    // Fetch all categories belonging to this store
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

    return NextResponse.json({ categories });
  } catch (err) {
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred while fetching categories." 
      } 
    }, { status: 500 });
  }
}
