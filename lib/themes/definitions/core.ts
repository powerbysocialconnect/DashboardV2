import type { ThemeDefinition } from "../types";
import {
  createHeaderSection,
  createFeaturedProductsSection,
  createFooterSection,
} from "../sectionBuilders";

/**
 * Core Theme — the default minimalist theme.
 * Includes basic sections that map to existing CoreLayout components.
 * Built using reusable section builders for consistency.
 */
export const coreTheme: ThemeDefinition = {
  code: "core",
  name: "Core",
  version: 2,
  description: "High-end minimalist theme. The default baseline for PixeoCommerce stores.",

  editableTokens: [
    { key: "primaryColor", label: "Primary Color", type: "color", defaultValue: "#000000" },
    { key: "accentColor", label: "Accent Color", type: "color", defaultValue: "#666666" },
    { key: "backgroundColor", label: "Background Color", type: "color", defaultValue: "#FFFFFF" },
    { key: "headingFont", label: "Heading Font", type: "font", defaultValue: "Inter" },
    { key: "bodyFont", label: "Body Font", type: "font", defaultValue: "Inter" },
  ],

  editableSections: [
    createHeaderSection({
      defaultLogoText: "PIXEO",
      supportsToggle: false,
    }),

    createFeaturedProductsSection({
      defaultHeading: "Selected Works",
      defaultColumns: "4",
      defaultLimit: 8,
    }),

    createFooterSection({
      defaultBrandDescription: "Crafting minimalist digital experiences for the next generation of commerce.",
      supportsToggle: false,
    }),
  ],
};
