import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  try {
    const { data: shippingMethods, error } = await supabase
      .from("shipping_methods")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("rate", { ascending: true });

    if (error) {
      return NextResponse.json({ 
        error: { 
          code: "DATABASE_ERROR", 
          message: error.message 
        } 
      }, { status: 400 });
    }

    return NextResponse.json({ shippingMethods });
  } catch (err: any) {
    console.error(`[HEADLESS SHIPPING METHODS ERROR]`, err);
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred while fetching shipping methods." 
      } 
    }, { status: 500 });
  }
}
