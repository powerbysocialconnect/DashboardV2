/**
 * PixeoCommerce V2 — Schema-Driven Theme Definitions
 *
 * Every theme exports a ThemeDefinition. The admin UI auto-generates
 * a grouped field editor from this schema. No hardcoded forms per theme.
 *
 * ADDING A NEW THEME:
 *  1. Create lib/themes/definitions/<name>.ts
 *  2. Use sectionBuilders.ts helpers where possible
 *  3. Import + register in lib/themes/registry.ts
 */

// ─── Field types ──────────────────────────────────────────────────────────────

export type ThemeFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "font"
  | "image"
  | "url"
  | "boolean"
  | "number"
  | "select"
  | "color"
  | "repeater";

export interface ThemeFieldOption {
  label: string;
  value: string;
}

export interface ThemeFieldDefinition {
  key: string;
  label: string;
  type: ThemeFieldType;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;

  options?: ThemeFieldOption[];

  /** Validation: text / textarea / richtext */
  maxLength?: number;
  minLength?: number;

  /** Validation: number */
  min?: number;
  max?: number;
  step?: number;

  /**
   * Repeater support: defines the shape of each item in a list.
   * Only applies when type === "repeater".
   * Value is stored as an array of objects, each keyed by itemFields[].key.
   */
  itemFields?: ThemeFieldDefinition[];

  /** Max items for a repeater field */
  maxItems?: number;
}

// ─── Token (global design variable) ─────────────────────────────────────────

export interface ThemeTokenDefinition {
  key: string;
  label: string;
  type: "color" | "text" | "font";
  defaultValue?: string;
  helpText?: string;
}

// ─── Section (grouped block of fields) ──────────────────────────────────────

export interface ThemeSectionDefinition {
  id: string;
  type: string;
  label: string;
  description?: string;
  fields: ThemeFieldDefinition[];
  /** If true, the admin editor shows an Enable/Disable toggle. Defaults to true. */
  supportsToggle?: boolean;
  /** Default enabled state when no stored value exists. Defaults to true. */
  defaultEnabled?: boolean;
}

// ─── Full theme definition ──────────────────────────────────────────────────

export interface ThemeDefinition {
  code: string;
  name: string;
  version: number;
  description?: string;
  thumbnail?: string;
  minPlan?: string;
  editableTokens?: ThemeTokenDefinition[];
  editableSections: ThemeSectionDefinition[];
}

// ─── Persisted config shape (stored in store_theme_configs.theme_settings) ──

export interface ThemeConfigData {
  themeCode: string;
  version: number;
  tokens: Record<string, unknown>;
  sections: Record<string, ThemeSectionConfigData>;
}

export interface ThemeSectionConfigData {
  enabled?: boolean;
  [fieldKey: string]: unknown;
}

// ─── Resolved config (schema defaults merged with stored values) ────────────

export interface ResolvedThemeConfig {
  themeCode: string;
  version: number;
  tokens: Record<string, unknown>;
  sections: Record<string, ResolvedSectionConfig>;
}

export interface ResolvedSectionConfig {
  enabled: boolean;
  [fieldKey: string]: unknown;
}
