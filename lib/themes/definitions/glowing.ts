import type { ThemeDefinition } from "../types";
import {
  createAnnouncementBarSection,
  createHeaderSection,
  createHeroSection,
  createBrandStatementSection,
  createServiceFeaturesSection,
  createLogoCloudSection,
  createPromoTilesSection,
  createFeaturedProductsSection,
  createNewsletterSection,
  createSocialGallerySection,
  createFooterSection,
} from "../sectionBuilders";

/**
 * Glowing Skincare Theme — schema definition
 *
 * Sections mirror the live Glowing theme's page structure.
 * Built using reusable section builders for consistency.
 */
export const glowingTheme: ThemeDefinition = {
  code: "glowing",
  name: "Glowing Skincare",
  version: 2,
  description:
    "An elegant, editorial skincare theme with warm tones, serif typography, and luxury branding.",
  minPlan: "Premium Store",

  editableTokens: [
    { key: "background", label: "Page Background", type: "color", defaultValue: "#F5F1EB" },
    { key: "surface", label: "Surface / Card Background", type: "color", defaultValue: "#EDE8E0" },
    { key: "text", label: "Body Text Color", type: "color", defaultValue: "#111111" },
    { key: "accent", label: "Accent Color", type: "color", defaultValue: "#C8B28A" },
    { key: "headingFont", label: "Heading Font", type: "font", defaultValue: "Cormorant Garamond" },
    { key: "bodyFont", label: "Body Font", type: "font", defaultValue: "Inter" },
  ],

  editableSections: [
    createAnnouncementBarSection({
      defaultText: "FREE SHIPPING ON ALL ORDERS OVER $75",
    }),

    createHeaderSection({
      defaultLogoText: "GLOWING",
      extraFields: [
        { key: "navLinks", label: "Navigation Links", type: "repeater", maxItems: 8,
          defaultValue: [
            { label: "Collections", url: "/collections" },
            { label: "Bespoke", url: "/bespoke" },
            { label: "Journal", url: "/journal" },
          ],
          itemFields: [
            { key: "label", label: "Link Label", type: "text" },
            { key: "url", label: "Link URL", type: "url" },
          ],
        },
      ],
    }),

    createHeroSection({
      defaultCtaLabel: "Shop Now",
      defaultCtaLink: "/collections/all",
    }),

    createBrandStatementSection({
      defaultHeading: '"Customer favorite beauty essentials"',
      defaultBody: "We believe that beauty is a reflection of your inner health and happiness. Our products are crafted with the purest ingredients to help you shine from within.",
    }),

    createServiceFeaturesSection({
      defaults: [
        { title: "Free Shipping", subtitle: "On all orders over $75" },
        { title: "Easy Returns", subtitle: "30-day return policy" },
        { title: "100% Organic", subtitle: "Natural ingredients only" },
        { title: "Secure Payment", subtitle: "100% secure checkout" },
      ],
    }),

    createLogoCloudSection({
      defaultHeading: "As Seen In",
      defaultLogos: [
        { name: "VOGUE", image: "" },
        { name: "ELLE", image: "" },
        { name: "BAZAAR", image: "" },
        { name: "GLAMOUR", image: "" },
        { name: "ALLURE", image: "" },
      ],
    }),

    createPromoTilesSection({
      defaultTiles: [
        { image: "", title: "Intensive Glow Serum", buttonLabel: "Shop Now", buttonLink: "/collections/serums" },
        { image: "", title: "25% off Everything", buttonLabel: "Shop Now", buttonLink: "/collections/all" },
      ],
    }),

    createFeaturedProductsSection({
      defaultHeading: "Our Featured Products",
      defaultCtaLabel: "View Archive",
      defaultCtaLink: "/collections/all",
      defaultLimit: 8,
      defaultColumns: "2",
    }),

    createNewsletterSection({
      defaultHeading: "Good emails",
      defaultSubheading: "Sign up for our newsletter and receive 10% off your first order.",
      defaultButtonLabel: "Subscribe",
    }),

    createSocialGallerySection({
      defaultHeading: "Follow Us",
      defaultHandle: "@glowing_skin",
      imageCount: 6,
    }),

    createFooterSection({
      defaultBrandName: "GLOWING SKINCARE STUDIO",
      defaultBrandDescription: "Exploring the intersection of architectural form and domestic comfort. High-end skincare products designed to bring out your natural glow.",
      defaultCopyright: "© 2026 Glowing Skincare Studio",
      extraFields: [
        { key: "shippingNote", label: "Shipping Note", type: "text", defaultValue: "Shipping worldwide from Copenhagen" },
      ],
    }),
  ],
};
