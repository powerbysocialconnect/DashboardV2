import { ThemeContract, SectionSchema } from '../types';

/**
 * Define a PixeoCommerce V2 Theme
 * Validates the theme configuration and provides a standard structure.
 */
export function defineTheme(config: {
  name: string;
  version: string;
  settings_schema: any;
  templates: Record<string, any>;
}) {
  return config;
}

/**
 * Define a Reusable Theme Section
 * Sections are the building blocks of a theme.
 */
export function defineSection<T = any>(
  schema: SectionSchema,
  component: React.ComponentType<{ settings: T; blocks?: any[] } & any>
) {
  return {
    schema,
    component,
  };
}
