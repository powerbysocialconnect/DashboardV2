import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Store,
  StoreThemeConfig,
  ThemeSettings,
  HomepageSection,
  StoreSectionOverride,
} from "@/types/database";
import { getThemeByCode } from "@/lib/themes/registry";
import { mergeThemeConfigWithDefaults } from "@/lib/themes/resolveThemeConfig";
import { sanitizeStoredConfig } from "@/lib/themes/validateThemeConfig";
import type { ThemeConfigData } from "@/lib/themes/types";

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primaryColor: "#111111",
  accentColor: "#D4AF37",
  backgroundColor: "#FFFFFF",
  headingFont: "Inter",
  bodyFont: "Inter",
  buttonStyle: "rounded",
  logoAlignment: "left",
};

const DEFAULT_HOMEPAGE_LAYOUT: HomepageSection[] = [
  {
    type: "hero",
    variant: "centered",
    title: "Welcome to our store",
    subtitle: "Discover amazing products",
    ctaLabel: "Shop now",
  },
  {
    type: "featured_products",
    title: "Featured Products",
    limit: 8,
  },
];

function isSchemaDrivenThemeSettings(value: unknown): value is ThemeConfigData {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.themeCode === "string" &&
    typeof rec.version === "number" &&
    typeof rec.tokens === "object" &&
    rec.tokens !== null &&
    typeof rec.sections === "object" &&
    rec.sections !== null
  );
}

function mapResolvedSectionsToHomepageLayout(
  themeCode: string,
  sections: Record<string, Record<string, unknown>>
): HomepageSection[] {
  const themeDef = getThemeByCode(themeCode);
  if (!themeDef) return [];

  return themeDef.editableSections.map((def) => {
    const resolvedSection = sections[def.id] || {};
    return {
      type: def.type as HomepageSection["type"],
      variant: undefined,
      ...(resolvedSection as Record<string, unknown>),
    } as HomepageSection;
  });
}

function mapTokensToLegacyThemeSettings(tokens: Record<string, unknown>): Partial<ThemeSettings> {
  return {
    primaryColor:
      (tokens.primaryColor as string) ||
      (tokens.accent as string) ||
      (tokens.text as string),
    accentColor:
      (tokens.accentColor as string) ||
      (tokens.accent as string),
    backgroundColor:
      (tokens.backgroundColor as string) ||
      (tokens.background as string),
    headingFont: tokens.headingFont as string,
    bodyFont: tokens.bodyFont as string,
  };
}

export interface StoreConfig {
  store: Store;
  themeConfig: StoreThemeConfig | null;
  effectiveThemeSettings: ThemeSettings;
  effectiveHomepageLayout: HomepageSection[];
  /** Per-store section overrides for the active theme (published only) */
  sectionOverrides: StoreSectionOverride[];
  isUsingNewConfig: boolean;
}

/**
 * Fetches store config with fallback to old branding fields.
 * If store_theme_configs exists for the store, uses it.
 * Otherwise, falls back to stores.branding JSON and defaults.
 */
export async function getStoreConfig(
  supabase: SupabaseClient,
  storeId: string
): Promise<StoreConfig | null> {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (storeError || !store) return null;

  const { data: themeConfig } = await supabase
    .from("store_theme_configs")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  // Fetch section overrides for the active theme (published only)
  let sectionOverrides: StoreSectionOverride[] = [];
  if (themeConfig) {
    const { data: overrides } = await supabase
      .from("store_section_overrides")
      .select("*")
      .eq("store_id", storeId)
      .eq("theme_code", themeConfig.theme_code)
      .eq("is_draft", false);

    sectionOverrides = (overrides || []) as StoreSectionOverride[];
  }

  if (themeConfig) {
    const rawThemeSettings = themeConfig.theme_settings as unknown;
    const activeThemeCode = themeConfig.theme_code;

    // V2 schema-driven settings: { themeCode, version, tokens, sections }
    if (isSchemaDrivenThemeSettings(rawThemeSettings)) {
      const themeDef = getThemeByCode(activeThemeCode);

      if (themeDef) {
        const sanitized = sanitizeStoredConfig(themeDef, {
          tokens: rawThemeSettings.tokens,
          sections: rawThemeSettings.sections as Record<string, Record<string, unknown>>,
        });
        const resolved = mergeThemeConfigWithDefaults(themeDef, sanitized);

        const mappedSettings: ThemeSettings = {
          ...DEFAULT_THEME_SETTINGS,
          ...mapTokensToLegacyThemeSettings(resolved.tokens),
        };

        const mappedLayout = mapResolvedSectionsToHomepageLayout(
          activeThemeCode,
          resolved.sections as Record<string, Record<string, unknown>>
        );

        return {
          store: store as Store,
          themeConfig: themeConfig as StoreThemeConfig,
          effectiveThemeSettings: mappedSettings,
          effectiveHomepageLayout:
            mappedLayout.length > 0 ? mappedLayout : DEFAULT_HOMEPAGE_LAYOUT,
          sectionOverrides,
          isUsingNewConfig: true,
        };
      }
    }

    // Legacy settings shape fallback
    return {
      store: store as Store,
      themeConfig: themeConfig as StoreThemeConfig,
      effectiveThemeSettings: {
        ...DEFAULT_THEME_SETTINGS,
        ...(rawThemeSettings as ThemeSettings),
      },
      effectiveHomepageLayout:
        (themeConfig.homepage_layout as HomepageSection[])?.length > 0
          ? (themeConfig.homepage_layout as HomepageSection[])
          : DEFAULT_HOMEPAGE_LAYOUT,
      sectionOverrides,
      isUsingNewConfig: true,
    };
  }

  // Fallback: derive settings from old branding field
  const branding = (store.branding as Record<string, unknown>) || {};
  const fallbackSettings: ThemeSettings = {
    ...DEFAULT_THEME_SETTINGS,
    primaryColor:
      (branding.primaryColor as string) || DEFAULT_THEME_SETTINGS.primaryColor,
    accentColor:
      (branding.accentColor as string) || DEFAULT_THEME_SETTINGS.accentColor,
  };

  return {
    store: store as Store,
    themeConfig: null,
    effectiveThemeSettings: fallbackSettings,
    effectiveHomepageLayout: DEFAULT_HOMEPAGE_LAYOUT,
    sectionOverrides: [],
    isUsingNewConfig: false,
  };
}

export async function getStoreConfigBySubdomain(
  supabase: SupabaseClient,
  subdomain: string
): Promise<StoreConfig | null> {
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("subdomain", subdomain)
    .single();

  if (!store) return null;
  return getStoreConfig(supabase, store.id);
}
