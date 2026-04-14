import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import type { StoreSectionOverride } from "@/types/database";

/**
 * GET /api/admin/stores/[id]/section-overrides
 * Fetch all published section overrides for a store's active theme.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeId = params.id;
    const adminClient = createAdminClient();

    // Get the store's active theme_code
    const { data: themeConfig } = await adminClient
      .from("store_theme_configs")
      .select("theme_code")
      .eq("store_id", storeId)
      .single();

    const themeCode = themeConfig?.theme_code || "starter";

    // Fetch published overrides for this store + theme
    const { data: overrides, error } = await adminClient
      .from("store_section_overrides")
      .select("*")
      .eq("store_id", storeId)
      .eq("theme_code", themeCode)
      .eq("is_draft", false)
      .order("section_type")
      .order("section_index");

    if (error) throw error;

    return NextResponse.json({
      overrides: (overrides || []) as StoreSectionOverride[],
      themeCode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/stores/[id]/section-overrides
 * Upsert a section override for a specific section.
 *
 * Body: {
 *   sectionType: string,
 *   sectionIndex: number,
 *   overrides: Record<string, unknown>,  // sparse field overrides
 *   isEnabled?: boolean
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeId = params.id;
    const body = await request.json();
    const {
      sectionType,
      sectionIndex = 0,
      overrides = {},
      isEnabled,
    } = body;

    if (!sectionType) {
      return NextResponse.json(
        { error: "sectionType is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get the store's active theme_code
    const { data: themeConfig } = await adminClient
      .from("store_theme_configs")
      .select("theme_code")
      .eq("store_id", storeId)
      .single();

    if (!themeConfig) {
      return NextResponse.json(
        { error: "Store has no theme configuration" },
        { status: 400 }
      );
    }

    const themeCode = themeConfig.theme_code;

    // Check for existing published override
    const { data: existing } = await adminClient
      .from("store_section_overrides")
      .select("id")
      .eq("store_id", storeId)
      .eq("theme_code", themeCode)
      .eq("section_type", sectionType)
      .eq("section_index", sectionIndex)
      .eq("is_draft", false)
      .single();

    const upsertData: Record<string, unknown> = {
      overrides,
    };

    // Only update is_enabled if explicitly provided
    if (isEnabled !== undefined) {
      upsertData.is_enabled = isEnabled;
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await adminClient
        .from("store_section_overrides")
        .update(upsertData)
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new
      const { error: insertError } = await adminClient
        .from("store_section_overrides")
        .insert({
          store_id: storeId,
          theme_code: themeCode,
          section_type: sectionType,
          section_index: sectionIndex,
          section_instance_id: `${sectionType}_${sectionIndex}`,
          overrides,
          is_enabled: isEnabled !== undefined ? isEnabled : true,
          is_draft: false,
        });

      if (insertError) throw insertError;
    }

    // Log the action
    const { logStoreAction } = await import("@/lib/admin/logStoreAction");
    await logStoreAction(adminClient, {
      store_id: storeId,
      action: "section_override_saved",
      details: {
        section_type: sectionType,
        section_index: sectionIndex,
        theme_code: themeCode,
        overridden_fields: Object.keys(overrides),
      },
      performed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stores/[id]/section-overrides
 * Remove a section override (revert entire section to theme defaults).
 *
 * Body: {
 *   sectionType: string,
 *   sectionIndex: number
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeId = params.id;
    const body = await request.json();
    const { sectionType, sectionIndex = 0 } = body;

    if (!sectionType) {
      return NextResponse.json(
        { error: "sectionType is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get the store's active theme_code
    const { data: themeConfig } = await adminClient
      .from("store_theme_configs")
      .select("theme_code")
      .eq("store_id", storeId)
      .single();

    const themeCode = themeConfig?.theme_code || "starter";

    const { error: deleteError } = await adminClient
      .from("store_section_overrides")
      .delete()
      .eq("store_id", storeId)
      .eq("theme_code", themeCode)
      .eq("section_type", sectionType)
      .eq("section_index", sectionIndex);

    if (deleteError) throw deleteError;

    // Log the action
    const { logStoreAction } = await import("@/lib/admin/logStoreAction");
    await logStoreAction(adminClient, {
      store_id: storeId,
      action: "section_override_reverted",
      details: {
        section_type: sectionType,
        section_index: sectionIndex,
        theme_code: themeCode,
      },
      performed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
