/**
 * PixeoCommerce — Schema-based theme config validation
 *
 * Validates incoming theme config payloads against the theme's schema.
 * Used in the admin PUT API route to reject bad data server-side.
 */

import type {
  ThemeDefinition,
  ThemeFieldDefinition,
  ThemeTokenDefinition,
  ThemeSectionConfigData,
} from "./types";

// ─── Validation result ───────────────────────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized: {
    tokens: Record<string, unknown>;
    sections: Record<string, ThemeSectionConfigData>;
  };
}

// ─── Field-level validators ──────────────────────────────────────────────────

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const SAFE_URL_RE = /^(\/[^\s]*|https?:\/\/[^\s]+)$/;

function isNonEmpty(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}

function validateScalarField(
  field: ThemeFieldDefinition,
  value: unknown,
  path: string,
  errors: ValidationError[]
): unknown {
  if (field.required && !isNonEmpty(value)) {
    errors.push({ path, message: `Required field "${field.label}" is missing` });
    return value;
  }

  if (!isNonEmpty(value)) return value;

  switch (field.type) {
    case "text":
    case "textarea":
    case "richtext":
    case "font": {
      if (typeof value !== "string") {
        errors.push({ path, message: `"${field.label}" must be a string` });
        return undefined;
      }
      if (field.maxLength && value.length > field.maxLength) {
        errors.push({ path, message: `"${field.label}" exceeds max length of ${field.maxLength}` });
      }
      if (field.minLength && value.length < field.minLength) {
        errors.push({ path, message: `"${field.label}" is shorter than min length of ${field.minLength}` });
      }
      return value;
    }

    case "image":
    case "url": {
      if (typeof value !== "string") {
        errors.push({ path, message: `"${field.label}" must be a string URL` });
        return undefined;
      }
      if (value.length > 0 && !SAFE_URL_RE.test(value)) {
        errors.push({ path, message: `"${field.label}" is not a valid URL (must start with / or http)` });
        return undefined;
      }
      return value;
    }

    case "number": {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num)) {
        errors.push({ path, message: `"${field.label}" must be a number` });
        return undefined;
      }
      if (field.min !== undefined && num < field.min) {
        errors.push({ path, message: `"${field.label}" must be >= ${field.min}` });
      }
      if (field.max !== undefined && num > field.max) {
        errors.push({ path, message: `"${field.label}" must be <= ${field.max}` });
      }
      return num;
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        if (value === "true") return true;
        if (value === "false") return false;
        errors.push({ path, message: `"${field.label}" must be a boolean` });
        return undefined;
      }
      return value;
    }

    case "color": {
      if (typeof value !== "string") {
        errors.push({ path, message: `"${field.label}" must be a color string` });
        return undefined;
      }
      if (value.length > 0 && !HEX_COLOR_RE.test(value)) {
        errors.push({ path, message: `"${field.label}" is not a valid hex color` });
      }
      return value;
    }

    case "select": {
      const allowed = (field.options || []).map((o) => o.value);
      if (!allowed.includes(String(value))) {
        errors.push({
          path,
          message: `"${field.label}" value "${value}" is not one of [${allowed.join(", ")}]`,
        });
        return undefined;
      }
      return String(value);
    }

    case "repeater": {
      if (!Array.isArray(value)) {
        errors.push({ path, message: `"${field.label}" must be an array` });
        return [];
      }
      if (field.maxItems && value.length > field.maxItems) {
        errors.push({ path, message: `"${field.label}" exceeds max ${field.maxItems} items` });
      }
      if (!field.itemFields || field.itemFields.length === 0) return value;

      const itemFieldMap = new Map(field.itemFields.map((f) => [f.key, f]));
      return value.map((item, idx) => {
        if (typeof item !== "object" || item === null) {
          errors.push({ path: `${path}[${idx}]`, message: "Item must be an object" });
          return {};
        }
        const sanitizedItem: Record<string, unknown> = {};
        const record = item as Record<string, unknown>;

        for (const [key, subField] of itemFieldMap) {
          if (key in record) {
            sanitizedItem[key] = validateScalarField(
              subField,
              record[key],
              `${path}[${idx}].${key}`,
              errors
            );
          }
        }
        return sanitizedItem;
      });
    }

    default:
      return value;
  }
}

// ─── Token validation ────────────────────────────────────────────────────────

function validateTokens(
  tokenDefs: ThemeTokenDefinition[],
  tokens: Record<string, unknown>,
  errors: ValidationError[]
): Record<string, unknown> {
  const tokenKeySet = new Set(tokenDefs.map((t) => t.key));
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(tokens)) {
    if (!tokenKeySet.has(key)) {
      errors.push({ path: `tokens.${key}`, message: `Unknown token "${key}"` });
      continue;
    }

    const def = tokenDefs.find((t) => t.key === key)!;
    const val = tokens[key];

    if (def.type === "color" && typeof val === "string" && val.length > 0) {
      if (!HEX_COLOR_RE.test(val)) {
        errors.push({ path: `tokens.${key}`, message: `Token "${def.label}" is not a valid hex color` });
        continue;
      }
    }

    if (typeof val !== "string" && val !== undefined) {
      errors.push({ path: `tokens.${key}`, message: `Token "${def.label}" must be a string` });
      continue;
    }

    sanitized[key] = val;
  }

  return sanitized;
}

// ─── Section validation ──────────────────────────────────────────────────────

function validateSections(
  sectionDefs: { id: string; fields: ThemeFieldDefinition[] }[],
  sections: Record<string, Record<string, unknown>>,
  errors: ValidationError[]
): Record<string, ThemeSectionConfigData> {
  const sectionIdSet = new Set(sectionDefs.map((s) => s.id));
  const sanitized: Record<string, ThemeSectionConfigData> = {};

  for (const sectionId of Object.keys(sections)) {
    if (!sectionIdSet.has(sectionId)) {
      errors.push({ path: `sections.${sectionId}`, message: `Unknown section "${sectionId}"` });
      continue;
    }

    const sectionDef = sectionDefs.find((s) => s.id === sectionId)!;
    const sectionData = sections[sectionId];
    const fieldKeySet = new Set(sectionDef.fields.map((f) => f.key));
    fieldKeySet.add("enabled");

    const sanitizedSection: ThemeSectionConfigData = {};

    for (const [key, val] of Object.entries(sectionData)) {
      if (key === "enabled") {
        sanitizedSection.enabled =
          typeof val === "boolean" ? val : val === "true" ? true : val === "false" ? false : true;
        continue;
      }

      if (!fieldKeySet.has(key)) {
        errors.push({
          path: `sections.${sectionId}.${key}`,
          message: `Unknown field "${key}" in section "${sectionId}"`,
        });
        continue;
      }

      const fieldDef = sectionDef.fields.find((f) => f.key === key)!;
      sanitizedSection[key] = validateScalarField(
        fieldDef,
        val,
        `sections.${sectionId}.${key}`,
        errors
      );
    }

    sanitized[sectionId] = sanitizedSection;
  }

  return sanitized;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function validateThemeConfig(
  themeDef: ThemeDefinition,
  payload: {
    tokens?: Record<string, unknown>;
    sections?: Record<string, Record<string, unknown>>;
  }
): ValidationResult {
  const errors: ValidationError[] = [];

  const sanitizedTokens = validateTokens(
    themeDef.editableTokens || [],
    payload.tokens || {},
    errors
  );

  const sanitizedSections = validateSections(
    themeDef.editableSections,
    payload.sections || {},
    errors
  );

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      tokens: sanitizedTokens,
      sections: sanitizedSections,
    },
  };
}

/**
 * Utility: returns all valid field paths for a theme definition.
 * Useful for debugging and auditing.
 */
export function getAllowedFieldPaths(themeDef: ThemeDefinition): string[] {
  const paths: string[] = [];
  for (const token of themeDef.editableTokens || []) {
    paths.push(`tokens.${token.key}`);
  }
  for (const section of themeDef.editableSections) {
    paths.push(`sections.${section.id}.enabled`);
    for (const field of section.fields) {
      paths.push(`sections.${section.id}.${field.key}`);
    }
  }
  return paths;
}

/**
 * Sanitize stored config against the current schema.
 * Strips any keys that no longer exist in the active schema version.
 * Returns a clean config safe for use.
 */
export function sanitizeStoredConfig(
  themeDef: ThemeDefinition,
  stored: {
    tokens?: Record<string, unknown>;
    sections?: Record<string, Record<string, unknown>>;
  }
): { tokens: Record<string, unknown>; sections: Record<string, ThemeSectionConfigData> } {
  const tokenKeys = new Set((themeDef.editableTokens || []).map((t) => t.key));
  const cleanTokens: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stored.tokens || {})) {
    if (tokenKeys.has(k)) cleanTokens[k] = v;
  }

  const sectionMap = new Map(
    themeDef.editableSections.map((s) => [s.id, new Set(s.fields.map((f) => f.key))])
  );
  const cleanSections: Record<string, ThemeSectionConfigData> = {};
  for (const [sectionId, sectionData] of Object.entries(stored.sections || {})) {
    const fieldKeys = sectionMap.get(sectionId);
    if (!fieldKeys) continue;
    const clean: ThemeSectionConfigData = {};
    for (const [k, v] of Object.entries(sectionData as Record<string, unknown>)) {
      if (k === "enabled" || fieldKeys.has(k)) {
        clean[k] = v;
      }
    }
    cleanSections[sectionId] = clean;
  }

  return { tokens: cleanTokens, sections: cleanSections };
}
