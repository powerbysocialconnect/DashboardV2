/**
 * PixeoCommerce V2 — Section Data Merge Engine
 *
 * Implements the 3-layer merge strategy:
 *   SchemaDefaults → ThemeSection → StoreOverrides → FinalData
 *
 * RULES:
 * - Merge engine iterates SCHEMA fields only (not override keys)
 * - Unknown override keys are silently ignored + logged as warnings
 * - Stale keys are preserved in DB, never deleted by the engine
 * - If is_enabled === false, section is marked as hidden
 */

import type { HomepageSection } from "@/types/database";
import type { StoreSectionOverride } from "@/types/database";
import {
  getSectionSchema,
  getSchemaDefaults,
  type SectionSchemaDefinition,
} from "./sectionSchemas";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MergedFieldMeta {
  /** The effective value after merge */
  value: unknown;
  /** Where the value came from */
  source: "schema_default" | "theme" | "store_override";
  /** Whether the store has explicitly overridden this field */
  isOverridden: boolean;
}

export interface MergedSectionData {
  /** The section type (e.g., "hero") */
  sectionType: string;
  /** Whether the section should be rendered (false = hidden by store) */
  isEnabled: boolean;
  /** The final merged field values (ready for rendering) */
  data: Record<string, unknown>;
  /** Per-field metadata (for the admin editor to show dirty indicators) */
  fieldMeta: Record<string, MergedFieldMeta>;
  /** Count of fields that have store overrides */
  overriddenFieldCount: number;
  /** Whether ANY store override exists for this section */
  hasOverrides: boolean;
}

// ─── Merge Function ────────────────────────────────────────────────────────────

/**
 * Merge theme defaults + store overrides for a single section.
 *
 * @param themeSection - The section entry from homepage_layout (theme-level data)
 * @param storeOverride - The store-specific override row (or null if none)
 * @param sectionSchema - Optional explicit schema (falls back to registry lookup)
 * @returns Merged section data with metadata
 */
export function mergeSectionData(
  themeSection: HomepageSection,
  storeOverride?: StoreSectionOverride | null,
  sectionSchema?: SectionSchemaDefinition | null
): MergedSectionData {
  const schema =
    sectionSchema || getSectionSchema(themeSection.type);

  // If no schema registered for this section type, return theme data as-is
  if (!schema) {
    return {
      sectionType: themeSection.type,
      isEnabled: storeOverride ? storeOverride.is_enabled : true,
      data: { ...themeSection },
      fieldMeta: {},
      overriddenFieldCount: 0,
      hasOverrides: false,
    };
  }

  const schemaDefaults = getSchemaDefaults(schema);
  const overrides = storeOverride?.overrides || {};
  const data: Record<string, unknown> = {};
  const fieldMeta: Record<string, MergedFieldMeta> = {};
  let overriddenFieldCount = 0;

  // Log unknown override keys (keys in overrides but not in schema)
  if (storeOverride?.overrides && typeof storeOverride.overrides === "object") {
    const schemaFieldIds = new Set(schema.fields.map((f) => f.id));
    for (const key of Object.keys(storeOverride.overrides)) {
      if (!schemaFieldIds.has(key)) {
        console.warn(
          `[SectionMerge] Unknown override key "${key}" for section "${themeSection.type}" — ignoring`
        );
      }
    }
  }

  // Iterate over SCHEMA fields only
  for (const field of schema.fields) {
    const overrideValue = (overrides as Record<string, unknown>)[field.id];
    const themeValue = (themeSection as unknown as Record<string, unknown>)[field.id];
    const schemaDefault = schemaDefaults[field.id];

    if (overrideValue !== undefined) {
      // Store has an explicit override for this field
      data[field.id] = overrideValue;
      fieldMeta[field.id] = {
        value: overrideValue,
        source: "store_override",
        isOverridden: true,
      };
      overriddenFieldCount++;
    } else if (themeValue !== undefined) {
      // Use theme-level value
      data[field.id] = themeValue;
      fieldMeta[field.id] = {
        value: themeValue,
        source: "theme",
        isOverridden: false,
      };
    } else {
      // Fall back to schema default
      data[field.id] = schemaDefault;
      fieldMeta[field.id] = {
        value: schemaDefault,
        source: "schema_default",
        isOverridden: false,
      };
    }
  }

  // Preserve the `type` field from the theme section (not an editable field)
  data.type = themeSection.type;

  return {
    sectionType: themeSection.type,
    isEnabled: storeOverride ? storeOverride.is_enabled : true,
    data,
    fieldMeta,
    overriddenFieldCount,
    hasOverrides: storeOverride != null && overriddenFieldCount > 0,
  };
}

// ─── Batch Merge ───────────────────────────────────────────────────────────────

/**
 * Merge all sections from homepage_layout with their corresponding store overrides.
 * This is the main function used by both the admin UI and storefront.
 *
 * @param homepageLayout - The ordered sections from store_theme_configs.homepage_layout
 * @param sectionOverrides - All store override rows for the active theme
 * @returns Array of merged section data in homepage_layout order
 */
export function mergeAllSections(
  homepageLayout: HomepageSection[],
  sectionOverrides: StoreSectionOverride[]
): MergedSectionData[] {
  // Index overrides for fast lookup: "sectionType:sectionIndex" → override
  const overrideMap = new Map<string, StoreSectionOverride>();
  for (const override of sectionOverrides) {
    const key = `${override.section_type}:${override.section_index}`;
    overrideMap.set(key, override);
  }

  // Track section_type occurrence index
  const typeIndexCounters: Record<string, number> = {};

  return homepageLayout.map((section) => {
    const sectionType = section.type;
    const sectionIndex = typeIndexCounters[sectionType] || 0;
    typeIndexCounters[sectionType] = sectionIndex + 1;

    const overrideKey = `${sectionType}:${sectionIndex}`;
    const storeOverride = overrideMap.get(overrideKey) || null;

    return mergeSectionData(section, storeOverride);
  });
}

/**
 * Convert merged section data back to a HomepageSection-compatible object.
 * Used by the storefront SectionRenderer which expects HomepageSection shape.
 */
export function mergedToHomepageSection(
  merged: MergedSectionData
): HomepageSection {
  return merged.data as unknown as HomepageSection;
}
