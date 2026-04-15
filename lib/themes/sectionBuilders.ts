/**
 * PixeoCommerce — Reusable Section Schema Builders
 *
 * Instead of redefining the same section shapes in every theme definition,
 * use these builders. They return typed ThemeSectionDefinition objects
 * with sensible defaults. Pass overrides for theme-specific customization.
 *
 * Usage:
 *   import { createHeroSection } from "@/lib/themes/sectionBuilders";
 *   const hero = createHeroSection({ defaultHeading: "Welcome" });
 */

import type { ThemeFieldDefinition, ThemeSectionDefinition } from "./types";

type SectionOverrides = Partial<
  Pick<ThemeSectionDefinition, "description" | "supportsToggle" | "defaultEnabled">
> & {
  extraFields?: ThemeFieldDefinition[];
};

function mergeFields(
  base: ThemeFieldDefinition[],
  extra?: ThemeFieldDefinition[]
): ThemeFieldDefinition[] {
  if (!extra || extra.length === 0) return base;
  const baseKeys = new Set(base.map((f) => f.key));
  const deduped = extra.filter((f) => !baseKeys.has(f.key));
  return [...base, ...deduped];
}

// ─── Announcement Bar ────────────────────────────────────────────────────────

export function createAnnouncementBarSection(
  opts: {
    defaultText?: string;
    defaultBg?: string;
    defaultTextColor?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "announcement_bar",
    type: "announcement_bar",
    label: "Announcement Bar",
    description: opts.description ?? "Top-of-page promotional strip",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "text", label: "Announcement Text", type: "text", defaultValue: opts.defaultText ?? "FREE SHIPPING ON ALL ORDERS OVER $75", placeholder: "e.g. Free shipping on orders over $75" },
        { key: "backgroundColor", label: "Bar Background", type: "color", defaultValue: opts.defaultBg ?? "#1A1A1A" },
        { key: "textColor", label: "Bar Text Color", type: "color", defaultValue: opts.defaultTextColor ?? "#FFFFFF" },
      ],
      opts.extraFields
    ),
  };
}

// ─── Header ──────────────────────────────────────────────────────────────────

export function createHeaderSection(
  opts: {
    defaultLogoText?: string;
    defaultSticky?: boolean;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "header",
    type: "header",
    label: "Header / Navigation",
    description: opts.description ?? "Logo, navigation links, and cart icon",
    supportsToggle: opts.supportsToggle ?? false,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "logoText", label: "Logo Text (if no image)", type: "text", defaultValue: opts.defaultLogoText ?? "STORE", placeholder: "STORE NAME" },
        { key: "sticky", label: "Sticky Header", type: "boolean", defaultValue: opts.defaultSticky ?? true },
      ],
      opts.extraFields
    ),
  };
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────

export function createHeroSection(
  opts: {
    defaultHeading?: string;
    defaultSubheading?: string;
    defaultCtaLabel?: string;
    defaultCtaLink?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "hero",
    type: "hero",
    label: "Hero Banner",
    description: opts.description ?? "Full-width hero image with optional overlay text",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "desktopImage", label: "Desktop Hero Image", type: "image", helpText: "Recommended: 1920×800px landscape" },
        { key: "mobileImage", label: "Mobile Hero Image (optional)", type: "image", helpText: "Recommended: 800×1000px portrait" },
        { key: "overlayHeading", label: "Overlay Heading", type: "text", defaultValue: opts.defaultHeading ?? "", placeholder: "e.g. New Collection" },
        { key: "overlaySubheading", label: "Overlay Subheading", type: "text", defaultValue: opts.defaultSubheading ?? "", placeholder: "e.g. Discover our latest arrivals" },
        { key: "ctaLabel", label: "Button Label", type: "text", defaultValue: opts.defaultCtaLabel ?? "Shop Now" },
        { key: "ctaLink", label: "Button Link", type: "url", defaultValue: opts.defaultCtaLink ?? "/collections/all" },
        {
          key: "overlayPosition", label: "Text Position", type: "select", defaultValue: "center",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      ],
      opts.extraFields
    ),
  };
}

// ─── Brand Statement ─────────────────────────────────────────────────────────

export function createBrandStatementSection(
  opts: {
    defaultHeading?: string;
    defaultBody?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "brand_statement",
    type: "brand_statement",
    label: "Brand Statement",
    description: opts.description ?? "Centered quote or tagline section",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "heading", label: "Heading / Quote", type: "textarea", defaultValue: opts.defaultHeading ?? "" },
        { key: "body", label: "Body Text", type: "textarea", defaultValue: opts.defaultBody ?? "" },
      ],
      opts.extraFields
    ),
  };
}

// ─── Service Features ────────────────────────────────────────────────────────

export function createServiceFeaturesSection(
  opts: {
    defaults?: { title: string; subtitle: string }[];
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  const defaults = opts.defaults ?? [
    { title: "Free Shipping", subtitle: "On all orders over $75" },
    { title: "Easy Returns", subtitle: "30-day return policy" },
    { title: "100% Organic", subtitle: "Natural ingredients only" },
    { title: "Secure Payment", subtitle: "100% secure checkout" },
  ];

  return {
    id: "service_features",
    type: "service_features",
    label: "Service Features",
    description: opts.description ?? "Icon grid highlighting key selling points",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        {
          key: "items",
          label: "Feature Items",
          type: "repeater",
          maxItems: 8,
          defaultValue: defaults.map((d) => ({ title: d.title, subtitle: d.subtitle, icon: "" })),
          itemFields: [
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "text" },
            { key: "icon", label: "Icon Image (optional)", type: "image" },
          ],
        },
      ],
      opts.extraFields
    ),
  };
}

// ─── Logo Cloud / Press ──────────────────────────────────────────────────────

export function createLogoCloudSection(
  opts: {
    defaultHeading?: string;
    defaultLogos?: { name: string; image: string }[];
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  const defaults = opts.defaultLogos ?? [
    { name: "VOGUE", image: "" },
    { name: "ELLE", image: "" },
    { name: "BAZAAR", image: "" },
    { name: "GLAMOUR", image: "" },
    { name: "ALLURE", image: "" },
  ];

  return {
    id: "logo_cloud",
    type: "logo_cloud",
    label: "Press / As Seen In",
    description: opts.description ?? "Row of publication or brand logos",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "heading", label: "Section Heading", type: "text", defaultValue: opts.defaultHeading ?? "As Seen In" },
        {
          key: "logos",
          label: "Logos",
          type: "repeater",
          maxItems: 10,
          defaultValue: defaults,
          itemFields: [
            { key: "name", label: "Brand Name", type: "text" },
            { key: "image", label: "Logo Image (optional)", type: "image" },
          ],
        },
      ],
      opts.extraFields
    ),
  };
}

// ─── Promo Tiles ─────────────────────────────────────────────────────────────

export function createPromoTilesSection(
  opts: {
    defaultTiles?: { image: string; title: string; buttonLabel: string; buttonLink: string }[];
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  const defaults = opts.defaultTiles ?? [
    { image: "", title: "Collection 1", buttonLabel: "Shop Now", buttonLink: "/collections/all" },
    { image: "", title: "Collection 2", buttonLabel: "Shop Now", buttonLink: "/collections/all" },
  ];

  return {
    id: "collection_promo",
    type: "collection_promo",
    label: "Promo Tiles",
    description: opts.description ?? "Side-by-side promotional image cards",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        {
          key: "tiles",
          label: "Promo Tiles",
          type: "repeater",
          maxItems: 6,
          defaultValue: defaults,
          itemFields: [
            { key: "image", label: "Tile Image", type: "image" },
            { key: "title", label: "Title", type: "text" },
            { key: "buttonLabel", label: "Button Label", type: "text" },
            { key: "buttonLink", label: "Button Link", type: "url" },
          ],
        },
      ],
      opts.extraFields
    ),
  };
}

// ─── Featured Products ───────────────────────────────────────────────────────

export function createFeaturedProductsSection(
  opts: {
    defaultHeading?: string;
    defaultCtaLabel?: string;
    defaultCtaLink?: string;
    defaultLimit?: number;
    defaultColumns?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "featured_products",
    type: "featured_products",
    label: "Featured Products",
    description: opts.description ?? "Product grid with heading and archive link",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "heading", label: "Section Heading", type: "text", defaultValue: opts.defaultHeading ?? "Featured Products" },
        {
          key: "sourceType",
          label: "Product Source",
          type: "select",
          defaultValue: "latest",
          options: [
            { label: "Latest Products", value: "latest" },
            { label: "Specific Category", value: "category" },
            { label: "Manual Selection", value: "manual" },
          ],
          helpText: "Choose how products are selected for this section.",
        },
        { key: "categoryId", label: "Selected Category", type: "category", helpText: "Leave empty to show all products" },
        {
          key: "productIds",
          label: "Manual Products",
          type: "product_multi",
          defaultValue: [],
          helpText: "Used when Product Source is Manual Selection.",
        },
        {
          key: "sortBy",
          label: "Sort Order",
          type: "select",
          defaultValue: "newest",
          options: [
            { label: "Newest First", value: "newest" },
            { label: "Oldest First", value: "oldest" },
            { label: "Price: Low to High", value: "price_asc" },
            { label: "Price: High to Low", value: "price_desc" },
            { label: "Name: A to Z", value: "name_asc" },
          ],
        },
        { key: "ctaLabel", label: "Archive Link Text", type: "text", defaultValue: opts.defaultCtaLabel ?? "View All" },
        { key: "ctaLink", label: "Archive Link URL", type: "url", defaultValue: opts.defaultCtaLink ?? "/collections/all" },
        { key: "limit", label: "Number of Products", type: "number", defaultValue: opts.defaultLimit ?? 8, min: 1, max: 24 },
        {
          key: "columns", label: "Grid Columns", type: "select", defaultValue: opts.defaultColumns ?? "4",
          options: [
            { label: "2 Columns", value: "2" },
            { label: "3 Columns", value: "3" },
            { label: "4 Columns", value: "4" },
          ],
        },
      ],
      opts.extraFields
    ),
  };
}

// ─── Newsletter ──────────────────────────────────────────────────────────────

export function createNewsletterSection(
  opts: {
    defaultHeading?: string;
    defaultSubheading?: string;
    defaultButtonLabel?: string;
    defaultBg?: string;
    defaultTextColor?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "newsletter",
    type: "newsletter",
    label: "Newsletter",
    description: opts.description ?? "Email signup section",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "heading", label: "Heading", type: "text", defaultValue: opts.defaultHeading ?? "Stay in touch" },
        { key: "subheading", label: "Subheading", type: "textarea", defaultValue: opts.defaultSubheading ?? "Sign up for our newsletter." },
        { key: "buttonLabel", label: "Button Text", type: "text", defaultValue: opts.defaultButtonLabel ?? "Subscribe" },
        { key: "backgroundColor", label: "Background Color", type: "color", defaultValue: opts.defaultBg ?? "#1A1A1A" },
        { key: "textColor", label: "Text Color", type: "color", defaultValue: opts.defaultTextColor ?? "#FFFFFF" },
      ],
      opts.extraFields
    ),
  };
}

// ─── Social Gallery ──────────────────────────────────────────────────────────

export function createSocialGallerySection(
  opts: {
    defaultHeading?: string;
    defaultHandle?: string;
    imageCount?: number;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  const imageCount = opts.imageCount ?? 6;
  const images: ThemeFieldDefinition[] = Array.from({ length: imageCount }, (_, i) => ({
    key: `image${i + 1}`,
    label: `Image ${i + 1}`,
    type: "image" as const,
  }));

  return {
    id: "social_gallery",
    type: "social_grid",
    label: "Social Gallery / Follow Us",
    description: opts.description ?? "Instagram-style image grid with follow link",
    supportsToggle: opts.supportsToggle ?? true,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "heading", label: "Heading", type: "text", defaultValue: opts.defaultHeading ?? "Follow Us" },
        { key: "instagramHandle", label: "Instagram Handle", type: "text", defaultValue: opts.defaultHandle ?? "@yourhandle", placeholder: "@yourhandle" },
        ...images,
      ],
      opts.extraFields
    ),
  };
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export function createFooterSection(
  opts: {
    defaultBrandName?: string;
    defaultBrandDescription?: string;
    defaultCopyright?: string;
  } & SectionOverrides = {}
): ThemeSectionDefinition {
  return {
    id: "footer",
    type: "footer",
    label: "Footer",
    description: opts.description ?? "Bottom section with brand info, links, and legal",
    supportsToggle: opts.supportsToggle ?? false,
    defaultEnabled: opts.defaultEnabled ?? true,
    fields: mergeFields(
      [
        { key: "brandName", label: "Brand Name", type: "text", defaultValue: opts.defaultBrandName ?? "" },
        { key: "brandDescription", label: "Brand Description", type: "textarea", defaultValue: opts.defaultBrandDescription ?? "" },
        { key: "copyrightText", label: "Copyright Text", type: "text", defaultValue: opts.defaultCopyright ?? "" },
        { key: "termsLink", label: "Terms Link", type: "url", defaultValue: "/terms" },
        { key: "privacyLink", label: "Privacy Link", type: "url", defaultValue: "/privacy" },
      ],
      opts.extraFields
    ),
  };
}
