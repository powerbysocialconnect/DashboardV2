import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  try {
    const { data: store, error } = await supabase
      .from("stores")
      .select(`
        id,
        name,
        subdomain,
        description,
        logo_url,
        currency,
        branding,
        status
      `)
      .eq("id", storeId)
      .single();

    if (error || !store) {
      return NextResponse.json({ 
        error: { 
          code: "STORE_NOT_FOUND", 
          message: "The requested store does not exist or is inactive." 
        } 
      }, { status: 404 });
    }

    // Fetch theme config as well
    const { data: themeConfig } = await supabase
      .from("store_theme_configs")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    return NextResponse.json({
      store,
      themeConfig
    });
  } catch (err) {
    return NextResponse.json({ 
      error: { 
        code: "INTERNAL_SERVER_ERROR", 
        message: "An unexpected error occurred while fetching store info." 
      } 
    }, { status: 500 });
  }
}
