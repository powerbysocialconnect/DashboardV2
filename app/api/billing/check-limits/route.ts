import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkProductLimit } from "@/lib/billing/enforcement";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: store } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .single();

    if (!store || store.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: billing } = await supabase
      .from("store_billing_settings")
      .select("plan_name")
      .eq("store_id", storeId)
      .single();

    const productLimit = await checkProductLimit(
      supabase,
      storeId,
      billing?.plan_name || null
    );

    return NextResponse.json({
      products: productLimit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
