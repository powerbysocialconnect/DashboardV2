import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Store,
  StoreThemeConfig,
  ThemeSettings,
  HomepageSection,
  StoreSectionOverride,
} from "@/types/database";

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
    .single();

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
    return {
      store: store as Store,
      themeConfig: themeConfig as StoreThemeConfig,
      effectiveThemeSettings: {
        ...DEFAULT_THEME_SETTINGS,
        ...(themeConfig.theme_settings as ThemeSettings),
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
