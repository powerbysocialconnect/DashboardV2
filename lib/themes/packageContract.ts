import { z } from "zod";

/**
 * Official Theme Package Contract for .zip ingestion.
 *
 * Required files:
 * - theme.json
 * - schema.json
 * - bundle.js
 * - bundle.css
 *
 * Optional files:
 * - blueprint.json
 * - assets/**
 * - preview.png|jpg|jpeg|webp
 */

export const THEME_PACKAGE_VERSION = "1.0";
export const MAX_ZIP_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_ENTRY_COUNT = 300;
export const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export const REQUIRED_FILES = ["theme.json", "schema.json", "bundle.js", "bundle.css"] as const;

export const SUPPORTED_FIELD_TYPES = [
  "text",
  "textarea",
  "richtext",
  "font",
  "image",
  "url",
  "boolean",
  "number",
  "select",
  "color",
  "category",
  "product_multi",
  "repeater",
] as const;

export const ThemePackageMetadataSchema = z.object({
  packageVersion: z.string().default(THEME_PACKAGE_VERSION),
  name: z.string().min(1),
  themeCode: z.string().regex(/^[a-z0-9-]+$/, "themeCode must be lowercase kebab-case"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semver (x.y.z)"),
  description: z.string().optional(),
  category: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  minPlan: z.string().optional(),
  requiredPlans: z.array(z.string()).optional(),
  systemInternalOnly: z.boolean().optional(),
});

const ThemeFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

type ThemeFieldInput = {
  key: string;
  label: string;
  type: (typeof SUPPORTED_FIELD_TYPES)[number];
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  itemFields?: ThemeFieldInput[];
  maxItems?: number;
};

export const ThemeFieldSchema: z.ZodType<ThemeFieldInput> = z.lazy(() =>
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(SUPPORTED_FIELD_TYPES),
    required: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    options: z.array(ThemeFieldOptionSchema).optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    itemFields: z.array(ThemeFieldSchema).optional(),
    maxItems: z.number().optional(),
  })
);

export const ThemeTokenSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["color", "text", "font"]),
  defaultValue: z.string().optional(),
  helpText: z.string().optional(),
});

export const ThemeSectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  supportsToggle: z.boolean().optional(),
  defaultEnabled: z.boolean().optional(),
  fields: z.array(ThemeFieldSchema),
});

export const ThemeSchemaDocumentSchema = z.object({
  editableTokens: z.array(ThemeTokenSchema).default([]),
  editableSections: z.array(ThemeSectionSchema).min(1),
});

export const ThemeBlueprintSchema = z.object({
  layoutMode: z.enum(["fixed", "flex"]).default("fixed"),
  sectionOrder: z.array(z.string()).default([]),
  sectionInstances: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        enabled: z.boolean().optional(),
      })
    )
    .optional(),
});

export type ThemePackageMetadata = z.infer<typeof ThemePackageMetadataSchema>;
export type ThemeSchemaDocument = z.infer<typeof ThemeSchemaDocumentSchema>;
export type ThemeBlueprintDocument = z.infer<typeof ThemeBlueprintSchema>;

export interface ThemePackageValidationResult {
  metadata: ThemePackageMetadata;
  schema: ThemeSchemaDocument;
  blueprint: ThemeBlueprintDocument | null;
}

export function validateThemePackageDocuments(args: {
  themeJson: unknown;
  schemaJson: unknown;
  blueprintJson?: unknown;
}): ThemePackageValidationResult {
  const metadata = ThemePackageMetadataSchema.parse(args.themeJson);
  const schema = ThemeSchemaDocumentSchema.parse(args.schemaJson);
  const blueprint = args.blueprintJson
    ? ThemeBlueprintSchema.parse(args.blueprintJson)
    : null;

  if (schema.editableSections.length === 0) {
    throw new Error("schema.json must include at least one editable section");
  }

  return { metadata, schema, blueprint };
}

export function normalizeZipEntryPath(entryName: string): string {
  return entryName.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function isPathTraversal(entryName: string): boolean {
  const normalized = normalizeZipEntryPath(entryName);
  return normalized.includes("..");
}
