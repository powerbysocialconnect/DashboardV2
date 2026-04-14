import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, themeCode, themeSettings, homepageLayout } =
      await request.json();

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    // Verify user owns the store or is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    if (!isAdmin) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("id", storeId)
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const adminClient = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (themeCode) updateData.theme_code = themeCode;
    if (themeSettings) updateData.theme_settings = themeSettings;
    if (homepageLayout) updateData.homepage_layout = homepageLayout;

    // Upsert: create if not exists, update if exists
    const { data: existing } = await adminClient
      .from("store_theme_configs")
      .select("id")
      .eq("store_id", storeId)
      .single();

    if (existing) {
      const { error } = await adminClient
        .from("store_theme_configs")
        .update(updateData)
        .eq("store_id", storeId);

      if (error) throw error;
    } else {
      const { error } = await adminClient
        .from("store_theme_configs")
        .insert({
          store_id: storeId,
          theme_code: themeCode || "starter",
          theme_settings: themeSettings || {},
          homepage_layout: homepageLayout || [],
        });

      if (error) throw error;
    }

    if (isAdmin) {
      const { logStoreAction } = await import("@/lib/admin/logStoreAction");
      await logStoreAction(adminClient, {
        store_id: storeId,
        action: "theme_config_updated",
        details: { themeCode, changed_by_admin: true },
        performed_by: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
