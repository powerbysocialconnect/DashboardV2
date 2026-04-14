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
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
