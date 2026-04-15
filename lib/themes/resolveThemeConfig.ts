/**
 * PixeoCommerce — Theme config default resolution & merging
 *
 * Ensures every field has a value by merging:
 *  1. Schema defaults (from ThemeDefinition)
 *  2. Stored config (from store_theme_configs.theme_settings)
 *
 * Used by:
 *  - Admin theme editor (on load)
 *  - API GET response
 *  - Storefront rendering (safe config access)
 */

import type {
  ThemeDefinition,
  ThemeFieldDefinition,
  ThemeSectionConfigData,
  ResolvedThemeConfig,
  ResolvedSectionConfig,
} from "./types";

// ─── Build complete default config from a theme schema ──────────────────────

function resolveFieldDefault(field: ThemeFieldDefinition): unknown {
  if (field.type === "repeater" || field.type === "product_multi") {
    return field.defaultValue ?? [];
  }
  if (field.type === "boolean") {
    return field.defaultValue ?? false;
  }
  if (field.type === "number") {
    return field.defaultValue ?? 0;
  }
  return field.defaultValue ?? "";
}

export function buildDefaultThemeConfig(
  themeDef: ThemeDefinition
): ResolvedThemeConfig {
  const tokens: Record<string, unknown> = {};
  for (const token of themeDef.editableTokens || []) {
    tokens[token.key] = token.defaultValue ?? "";
  }

  const sections: Record<string, ResolvedSectionConfig> = {};
  for (const section of themeDef.editableSections) {
    const sectionData: ResolvedSectionConfig = {
      enabled: section.defaultEnabled !== false,
    };
    for (const field of section.fields) {
      sectionData[field.key] = resolveFieldDefault(field);
    }
    sections[section.id] = sectionData;
  }

  return {
    themeCode: themeDef.code,
    version: themeDef.version,
    tokens,
    sections,
  };
}

// ─── Merge stored config over schema defaults ───────────────────────────────

export function mergeThemeConfigWithDefaults(
  themeDef: ThemeDefinition,
  stored: {
    tokens?: Record<string, unknown>;
    sections?: Record<string, ThemeSectionConfigData | Record<string, unknown>>;
  } | null | undefined
): ResolvedThemeConfig {
  const defaults = buildDefaultThemeConfig(themeDef);

  if (!stored) return defaults;

  const mergedTokens: Record<string, unknown> = { ...defaults.tokens };
  if (stored.tokens) {
    for (const [key, val] of Object.entries(stored.tokens)) {
      if (key in mergedTokens && val !== undefined && val !== null) {
        mergedTokens[key] = val;
      }
    }
  }

  const mergedSections: Record<string, ResolvedSectionConfig> = {};
  for (const sectionDef of themeDef.editableSections) {
    const defaultSection = defaults.sections[sectionDef.id];
    const storedSection = stored.sections?.[sectionDef.id];

    if (!storedSection) {
      mergedSections[sectionDef.id] = defaultSection;
      continue;
    }

    const merged: ResolvedSectionConfig = { ...defaultSection };

    if (typeof storedSection.enabled === "boolean") {
      merged.enabled = storedSection.enabled;
    }

    for (const field of sectionDef.fields) {
      const storedVal = (storedSection as Record<string, unknown>)[field.key];
      if (storedVal !== undefined && storedVal !== null) {
        merged[field.key] = storedVal;
      }
    }

    mergedSections[sectionDef.id] = merged;
  }

  return {
    themeCode: themeDef.code,
    version: themeDef.version,
    tokens: mergedTokens,
    sections: mergedSections,
  };
}

/**
 * Resolve a specific section's config by id.
 * Returns a flat record with all fields filled in (defaults + stored overrides).
 * Useful for storefront rendering of a single section.
 */
export function resolveSectionConfig(
  themeDef: ThemeDefinition,
  sectionId: string,
  storedSections?: Record<string, Record<string, unknown>>
): ResolvedSectionConfig | null {
  const sectionDef = themeDef.editableSections.find((s) => s.id === sectionId);
  if (!sectionDef) return null;

  const resolved: ResolvedSectionConfig = {
    enabled: sectionDef.defaultEnabled !== false,
  };

  for (const field of sectionDef.fields) {
    resolved[field.key] = resolveFieldDefault(field);
  }

  const stored = storedSections?.[sectionId];
  if (stored) {
    if (typeof stored.enabled === "boolean") resolved.enabled = stored.enabled;
    for (const field of sectionDef.fields) {
      if (stored[field.key] !== undefined && stored[field.key] !== null) {
        resolved[field.key] = stored[field.key];
      }
    }
  }

  return resolved;
}
