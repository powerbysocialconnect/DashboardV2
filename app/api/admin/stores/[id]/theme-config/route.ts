import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { getThemeByCode } from "@/lib/themes/registry";
import { validateThemeConfig, sanitizeStoredConfig } from "@/lib/themes/validateThemeConfig";
import { mergeThemeConfigWithDefaults } from "@/lib/themes/resolveThemeConfig";
import type { ThemeConfigData } from "@/lib/themes/types";

async function requireAdmin(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Forbidden", status: 403 } as const;
  return { user } as const;
}

/**
 * GET /api/admin/stores/[id]/theme-config
 * Returns the store's current theme config merged with schema defaults.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const auth = await requireAdmin(supabase);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();
    const storeId = params.id;

    const { data: themeConfig } = await adminClient
      .from("store_theme_configs")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    const themeCode = themeConfig?.theme_code || "core";
    const themeDef = getThemeByCode(themeCode);

    if (!themeDef) {
      return NextResponse.json({
        themeConfig,
        themeCode,
        themeDefinition: null,
        resolvedConfig: null,
      });
    }

    const storedSettings = themeConfig?.theme_settings as ThemeConfigData | null;
    const sanitized = storedSettings
      ? sanitizeStoredConfig(themeDef, {
          tokens: storedSettings.tokens,
          sections: storedSettings.sections,
        })
      : null;

    const resolvedConfig = mergeThemeConfigWithDefaults(themeDef, sanitized);

    return NextResponse.json({
      themeConfig,
      themeCode,
      themeDefinition: themeDef,
      resolvedConfig,
    });
  } catch (err: unknown) {
    console.error("[theme-config GET]", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/stores/[id]/theme-config
 * Save updated theme config (tokens + sections) for a store.
 * Admin-only. Validates payload against theme schema before saving.
 *
 * Body: { themeCode: string, tokens: Record<string, unknown>, sections: Record<string, Record<string, unknown>> }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const auth = await requireAdmin(supabase);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { themeCode, tokens, sections } = body as {
      themeCode: string;
      tokens: Record<string, unknown>;
      sections: Record<string, Record<string, unknown>>;
    };

    if (!themeCode || typeof themeCode !== "string") {
      return NextResponse.json({ error: "themeCode is required" }, { status: 400 });
    }

    const themeDef = getThemeByCode(themeCode);
    if (!themeDef) {
      return NextResponse.json({ error: `Unknown theme: ${themeCode}` }, { status: 400 });
    }

    const validation = validateThemeConfig(themeDef, {
      tokens: tokens || {},
      sections: sections || {},
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 422 }
      );
    }

    const adminClient = createAdminClient();
    const storeId = params.id;

    const configPayload: ThemeConfigData = {
      themeCode,
      version: themeDef.version,
      tokens: validation.sanitized.tokens,
      sections: validation.sanitized.sections,
    };

    const { data: existing } = await adminClient
      .from("store_theme_configs")
      .select("id")
      .eq("store_id", storeId)
      .maybeSingle();

    if (existing) {
      const { error } = await adminClient
        .from("store_theme_configs")
        .update({
          theme_code: themeCode,
          theme_settings: configPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId);

      if (error) throw error;
    } else {
      const { error } = await adminClient
        .from("store_theme_configs")
        .insert({
          store_id: storeId,
          theme_code: themeCode,
          theme_settings: configPayload,
          homepage_layout: [],
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[theme-config PUT]", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal error" },
      { status: 500 }
    );
  }
}
