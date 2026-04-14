/**
 * PixeoCommerce V2 — Theme Section Schema Registry
 *
 * Single source of truth for all editable fields per section type.
 * The admin UI auto-generates forms from these schemas.
 * The merge engine uses them to resolve defaults and ignore stale keys.
 *
 * RULES:
 * - Schema defines structure. Theme defines defaults. Store defines overrides.
 * - Unknown override keys (not in schema) are silently ignored during merge.
 * - Validation metadata is enforced in the UI and API, not in the merge engine.
 */

// ─── Field Types ───────────────────────────────────────────────────────────────

export type SectionFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "image"
  | "url"
  | "boolean"
  | "select"
  | "color"
  | "number";

export interface SectionFieldOption {
  label: string;
  value: string;
}

export interface SectionFieldDefinition {
  id: string;
  type: SectionFieldType;
  label: string;
  description?: string;
  default?: unknown;
  group?: string;

  // Validation — TEXT
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Validation — IMAGE
  fileTypes?: string[];
  maxFileSizeMB?: number;
  recommendedAspectRatio?: string;

  // Validation — NUMBER
  min?: number;
  max?: number;
  step?: number;

  // SELECT options
  options?: SectionFieldOption[];
}

// ─── Section Schema ────────────────────────────────────────────────────────────

export interface SectionSchemaDefinition {
  sectionType: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  fields: SectionFieldDefinition[];
  /** Field group labels for the editor UI */
  groups?: Record<string, string>;
}

// ─── Field Groups (shared labels) ──────────────────────────────────────────────

const STANDARD_GROUPS: Record<string, string> = {
  content: "Content",
  media: "Media",
  cta: "Call to Action",
  layout: "Layout & Style",
  visibility: "Visibility",
};

// ─── Hero Section ──────────────────────────────────────────────────────────────

const heroSchema: SectionSchemaDefinition = {
  sectionType: "hero",
  label: "Hero Section",
  description: "Full-width banner with heading, image, and call-to-action button",
  icon: "LayoutTemplate",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      description: "Main headline displayed on the hero",
      default: "Welcome to our store",
      group: "content",
      required: true,
      maxLength: 120,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Subtitle",
      description: "Supporting text below the heading",
      default: "Discover amazing products",
      group: "content",
      maxLength: 300,
    },
    {
      id: "body",
      type: "textarea",
      label: "Body Text",
      description: "Optional longer description",
      group: "content",
      maxLength: 1000,
    },
    {
      id: "imageUrl",
      type: "image",
      label: "Hero Image",
      description: "Background or featured image for the hero section",
      group: "media",
      fileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMB: 5,
      recommendedAspectRatio: "16:9",
    },
    {
      id: "mobileImageUrl",
      type: "image",
      label: "Mobile Hero Image",
      description: "Optional image optimized for mobile devices",
      group: "media",
      fileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMB: 3,
      recommendedAspectRatio: "9:16",
    },
    {
      id: "ctaLabel",
      type: "text",
      label: "Button Text",
      description: "Text displayed on the CTA button",
      default: "Shop now",
      group: "cta",
      maxLength: 40,
    },
    {
      id: "ctaUrl",
      type: "url",
      label: "Button Link",
      description: "URL the button navigates to",
      default: "#",
      group: "cta",
    },
    {
      id: "variant",
      type: "select",
      label: "Layout Variant",
      description: "Choose the visual layout for this section",
      default: "centered",
      group: "layout",
      options: [
        { label: "Centered (Full-width image overlay)", value: "centered" },
        { label: "Left Aligned (Image + Text side-by-side)", value: "left-aligned" },
        { label: "Minimal (Text only, no image)", value: "minimal" },
      ],
    },
  ],
};

// ─── Featured Products ─────────────────────────────────────────────────────────

const featuredProductsSchema: SectionSchemaDefinition = {
  sectionType: "featured_products",
  label: "Featured Products",
  description: "Display a curated grid of products",
  icon: "ShoppingBag",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Section Title",
      default: "Featured Products",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Section Subtitle",
      group: "content",
      maxLength: 200,
    },
    {
      id: "limit",
      type: "number",
      label: "Number of Products",
      description: "Maximum products to display",
      default: 8,
      group: "layout",
      min: 1,
      max: 24,
      step: 1,
    },
  ],
};

// ─── Category Grid ─────────────────────────────────────────────────────────────

const categoryGridSchema: SectionSchemaDefinition = {
  sectionType: "category_grid",
  label: "Category Grid",
  description: "Display product categories in a visual grid",
  icon: "Grid3X3",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Section Title",
      default: "Shop by Category",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Section Subtitle",
      group: "content",
      maxLength: 200,
    },
  ],
};

// ─── Image With Text ───────────────────────────────────────────────────────────

const imageWithTextSchema: SectionSchemaDefinition = {
  sectionType: "image_with_text",
  label: "Image With Text",
  description: "Side-by-side image and text content block",
  icon: "ImageIcon",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      default: "Our Story",
      group: "content",
      maxLength: 100,
    },
    {
      id: "body",
      type: "textarea",
      label: "Body Text",
      description: "Detailed description or brand story",
      group: "content",
      maxLength: 2000,
    },
    {
      id: "imageUrl",
      type: "image",
      label: "Section Image",
      group: "media",
      fileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMB: 5,
      recommendedAspectRatio: "4:3",
    },
    {
      id: "ctaLabel",
      type: "text",
      label: "Button Text",
      group: "cta",
      maxLength: 40,
    },
    {
      id: "ctaUrl",
      type: "url",
      label: "Button Link",
      group: "cta",
    },
    {
      id: "variant",
      type: "select",
      label: "Image Position",
      default: "default",
      group: "layout",
      options: [
        { label: "Image Left, Text Right", value: "default" },
        { label: "Image Right, Text Left", value: "reversed" },
      ],
    },
  ],
};

// ─── Testimonials ──────────────────────────────────────────────────────────────

const testimonialsSchema: SectionSchemaDefinition = {
  sectionType: "testimonials",
  label: "Testimonials",
  description: "Customer reviews and quotes",
  icon: "Quote",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Section Title",
      default: "What Our Customers Say",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Section Subtitle",
      group: "content",
      maxLength: 200,
    },
  ],
};

// ─── Newsletter ────────────────────────────────────────────────────────────────

const newsletterSchema: SectionSchemaDefinition = {
  sectionType: "newsletter",
  label: "Newsletter",
  description: "Email signup section for marketing",
  icon: "Mail",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      default: "Stay in the loop",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Description",
      default: "Subscribe for updates and exclusive offers",
      group: "content",
      maxLength: 300,
    },
    {
      id: "ctaLabel",
      type: "text",
      label: "Button Text",
      default: "Subscribe",
      group: "cta",
      maxLength: 30,
    },
  ],
};

// ─── Rich Text ─────────────────────────────────────────────────────────────────

const richTextSchema: SectionSchemaDefinition = {
  sectionType: "rich_text",
  label: "Rich Text",
  description: "Free-form text content block",
  icon: "Type",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      group: "content",
      maxLength: 120,
    },
    {
      id: "body",
      type: "richtext",
      label: "Content",
      description: "The main text content for this section",
      group: "content",
      maxLength: 5000,
    },
  ],
};

// ─── Promotional Banner ────────────────────────────────────────────────────────

const promotionalBannerSchema: SectionSchemaDefinition = {
  sectionType: "promotional_banner",
  label: "Promotional Banner",
  description: "Eye-catching banner for sales, launches, or promotions",
  icon: "Megaphone",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Banner Title",
      default: "Special Offer",
      group: "content",
      required: true,
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "textarea",
      label: "Banner Description",
      group: "content",
      maxLength: 200,
    },
    {
      id: "imageUrl",
      type: "image",
      label: "Banner Image",
      group: "media",
      fileTypes: ["image/jpeg", "image/png", "image/webp"],
      maxFileSizeMB: 5,
      recommendedAspectRatio: "21:9",
    },
    {
      id: "ctaLabel",
      type: "text",
      label: "Button Text",
      default: "Shop Sale",
      group: "cta",
      maxLength: 30,
    },
    {
      id: "ctaUrl",
      type: "url",
      label: "Button Link",
      default: "#",
      group: "cta",
    },
    {
      id: "backgroundColor",
      type: "color",
      label: "Background Color",
      default: "#000000",
      group: "layout",
    },
  ],
};

// ─── Announcement Bar ──────────────────────────────────────────────────────────

const announcementBarSchema: SectionSchemaDefinition = {
  sectionType: "announcement_bar",
  label: "Announcement Bar",
  description: "Thin banner at the top of the page for important messages",
  icon: "Bell",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Announcement Text",
      default: "Free shipping on orders over $50",
      group: "content",
      required: true,
      maxLength: 120,
    },
    {
      id: "ctaLabel",
      type: "text",
      label: "Link Text",
      description: "Optional clickable text next to the announcement",
      group: "cta",
      maxLength: 30,
    },
    {
      id: "ctaUrl",
      type: "url",
      label: "Link URL",
      group: "cta",
    },
    {
      id: "backgroundColor",
      type: "color",
      label: "Background Color",
      default: "#000000",
      group: "layout",
    },
    {
      id: "textColor",
      type: "color",
      label: "Text Color",
      default: "#FFFFFF",
      group: "layout",
    },
  ],
};

// ─── Logo Cloud ────────────────────────────────────────────────────────────────

const logoCloudSchema: SectionSchemaDefinition = {
  sectionType: "logo_cloud",
  label: "Logo Cloud",
  description: "Display a row of partner or press logos (e.g., 'As Seen In')",
  icon: "Component",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      default: "As Seen In",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "text",
      label: "Subtitle",
      group: "content",
      maxLength: 150,
    },
    {
      id: "opacity",
      type: "number",
      label: "Logo Opacity",
      description: "Transparency of logos (0 to 1)",
      default: 0.6,
      group: "layout",
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      id: "variant",
      type: "select",
      label: "Logo Style",
      default: "grayscale",
      group: "layout",
      options: [
        { label: "Original Colors", value: "original" },
        { label: "Grayscale", value: "grayscale" },
        { label: "Inverse (White)", value: "inverse" },
      ],
    },
  ],
};

// ─── Service Features ─────────────────────────────────────────────────────────

const serviceFeaturesSchema: SectionSchemaDefinition = {
  sectionType: "service_features",
  label: "Service Features",
  description: "Row of icons with text highlighting store benefits (e.g., Free Shipping)",
  icon: "ShieldCheck",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "variant",
      type: "select",
      label: "Visual Style",
      default: "minimal",
      group: "layout",
      options: [
        { label: "Minimal (Icons + Text)", value: "minimal" },
        { label: "Cards (Boxed background)", value: "cards" },
        { label: "Bold (Colored background)", value: "bold" },
      ],
    },
    {
      id: "columns",
      type: "number",
      label: "Desktop Columns",
      default: 4,
      group: "layout",
      min: 2,
      max: 6,
    },
  ],
};

// ─── Social Grid ───────────────────────────────────────────────────────────────

const socialGridSchema: SectionSchemaDefinition = {
  sectionType: "social_grid",
  label: "Social / Instagram Grid",
  description: "Visual grid of social media tiles",
  icon: "Instagram",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title",
      type: "text",
      label: "Heading",
      default: "Follow Us",
      group: "content",
      maxLength: 80,
    },
    {
      id: "subtitle",
      type: "text",
      label: "Username / Handle",
      default: "@pixeocommerce",
      group: "content",
      maxLength: 80,
    },
    {
      id: "limit",
      type: "number",
      label: "Count",
      description: "Number of tiles to show",
      default: 5,
      group: "layout",
      min: 3,
      max: 12,
    },
    {
      id: "showHandle",
      type: "boolean",
      label: "Show social handle",
      default: true,
      group: "content",
    },
  ],
};

// ─── Collection Promo (Dual Banner) ───────────────────────────────────────────

const collectionPromoSchema: SectionSchemaDefinition = {
  sectionType: "collection_promo",
  label: "Collection Promo (Dual Banner)",
  description: "Two balanced side-by-side promotional banners",
  icon: "Columns2",
  groups: STANDARD_GROUPS,
  fields: [
    {
      id: "title1",
      type: "text",
      label: "Promo 1: Heading",
      default: "New Arrivals",
      group: "content",
    },
    {
      id: "ctaLabel1",
      type: "text",
      label: "Promo 1: Button Text",
      default: "Shop New",
      group: "cta",
    },
    {
      id: "imageUrl1",
      type: "image",
      label: "Promo 1: Image",
      group: "media",
    },
    {
      id: "title2",
      type: "text",
      label: "Promo 2: Heading",
      default: "Summer Sale",
      group: "content",
    },
    {
      id: "ctaLabel2",
      type: "text",
      label: "Promo 2: Button Text",
      default: "Save 20%",
      group: "cta",
    },
    {
      id: "imageUrl2",
      type: "image",
      label: "Promo 2: Image",
      group: "media",
    },
  ],
};


// ─── Registry ──────────────────────────────────────────────────────────────────

/**
 * Master registry of all section schemas, keyed by sectionType.
 * Used by:
 * - Admin UI → auto-generates section editor forms
 * - Merge engine → resolves defaults, ignores unknown keys
 * - Validation → enforces field constraints
 */
export const SECTION_SCHEMA_REGISTRY: Record<string, SectionSchemaDefinition> = {
  hero: heroSchema,
  featured_products: featuredProductsSchema,
  category_grid: categoryGridSchema,
  image_with_text: imageWithTextSchema,
  testimonials: testimonialsSchema,
  newsletter: newsletterSchema,
  rich_text: richTextSchema,
  promotional_banner: promotionalBannerSchema,
  announcement_bar: announcementBarSchema,
  logo_cloud: logoCloudSchema,
  service_features: serviceFeaturesSchema,
  social_grid: socialGridSchema,
  collection_promo: collectionPromoSchema,
};


/**
 * Get schema for a section type. Returns undefined if not registered.
 */
export function getSectionSchema(
  sectionType: string
): SectionSchemaDefinition | undefined {
  return SECTION_SCHEMA_REGISTRY[sectionType];
}

/**
 * Get all registered section types.
 */
export function getRegisteredSectionTypes(): string[] {
  return Object.keys(SECTION_SCHEMA_REGISTRY);
}

/**
 * Extract the default values from a schema definition.
 * Returns a Record<fieldId, defaultValue> with only fields that have defaults.
 */
export function getSchemaDefaults(
  schema: SectionSchemaDefinition
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.default !== undefined) {
      defaults[field.id] = field.default;
    }
  }
  return defaults;
}

/**
 * Validate a single field value against its schema definition.
 * Returns null if valid, or an error message string.
 */
export function validateFieldValue(
  field: SectionFieldDefinition,
  value: unknown
): string | null {
  // Required check
  if (field.required && (value === undefined || value === null || value === "")) {
    return `${field.label} is required`;
  }

  // Skip further checks if value is empty and not required
  if (value === undefined || value === null || value === "") return null;

  // Text / textarea / richtext constraints
  if (field.type === "text" || field.type === "textarea" || field.type === "richtext") {
    const str = String(value);
    if (field.maxLength && str.length > field.maxLength) {
      return `${field.label} must be at most ${field.maxLength} characters`;
    }
    if (field.minLength && str.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters`;
    }
    if (field.pattern) {
      const re = new RegExp(field.pattern);
      if (!re.test(str)) {
        return `${field.label} format is invalid`;
      }
    }
  }

  // URL validation
  if (field.type === "url" && typeof value === "string" && value.length > 0) {
    try {
      // Allow relative URLs starting with / or #
      if (!value.startsWith("/") && !value.startsWith("#")) {
        new URL(value);
      }
    } catch {
      return `${field.label} must be a valid URL`;
    }
  }

  // Number constraints
  if (field.type === "number") {
    const num = Number(value);
    if (isNaN(num)) return `${field.label} must be a number`;
    if (field.min !== undefined && num < field.min) {
      return `${field.label} must be at least ${field.min}`;
    }
    if (field.max !== undefined && num > field.max) {
      return `${field.label} must be at most ${field.max}`;
    }
  }

  // Select — value must be in options
  if (field.type === "select" && field.options) {
    const validValues = field.options.map((o) => o.value);
    if (!validValues.includes(String(value))) {
      return `${field.label}: invalid option "${value}"`;
    }
  }

  return null;
}

/**
 * Validate all field values for a section against its schema.
 * Returns an object of { fieldId: errorMessage } for invalid fields. Empty = all valid.
 */
export function validateSectionOverrides(
  schema: SectionSchemaDefinition,
  overrides: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of schema.fields) {
    const value = overrides[field.id];
    const error = validateFieldValue(field, value);
    if (error) {
      errors[field.id] = error;
    }
  }
  return errors;
}
