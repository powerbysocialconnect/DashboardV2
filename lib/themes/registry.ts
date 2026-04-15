/**
 * PixeoCommerce Theme Registry
 *
 * Central registry of all theme definitions. Adding a new theme is one step:
 *  1. Create `lib/themes/definitions/<name>.ts` exporting a ThemeDefinition
 *  2. Import it here and add to THEME_REGISTRY
 *
 * The admin field editor, merchant theme viewer, and storefront renderer
 * all resolve themes through this registry.
 */

import type { ThemeDefinition } from "./types";
import { coreTheme } from "./definitions/core";
import { glowingTheme } from "./definitions/glowing";

const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  [coreTheme.code]: coreTheme,
  [glowingTheme.code]: glowingTheme,
};

export function getAllThemes(): ThemeDefinition[] {
  return Object.values(THEME_REGISTRY);
}

export function getThemeByCode(code: string): ThemeDefinition | undefined {
  return THEME_REGISTRY[code];
}

export function getThemeCodes(): string[] {
  return Object.keys(THEME_REGISTRY);
}
