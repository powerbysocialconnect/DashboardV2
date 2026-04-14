import type { HomepageSection, Product, ThemeSettings, StoreSectionOverride } from "@/types/database";
import HeroSection from "./HeroSection";
import FeaturedProducts from "./FeaturedProducts";
import CategoryGrid from "./CategoryGrid";
import ImageWithText from "./ImageWithText";
import Testimonials from "./Testimonials";
import Newsletter from "./Newsletter";
import RichText from "./RichText";
// V2 CORE Theme Sections
import CoreFeaturedProducts from "../../../themes/core/sections/featured-products";
import { mergeSectionData, mergedToHomepageSection } from "@/lib/themes/mergeSectionData";

interface SectionRendererProps {
  section: HomepageSection;
  settings: ThemeSettings;
  products: Product[];
  themeCode?: string;
  sectionClassName?: string;
  heroTitleClassName?: string;
  heroSubtitleClassName?: string;
  /** Store-specific override for this section (already looked up by caller) */
  sectionOverride?: StoreSectionOverride | null;
}

export default function SectionRenderer({
  section,
  settings,
  products,
  themeCode,
  sectionClassName,
  heroTitleClassName,
  heroSubtitleClassName,
  sectionOverride,
}: SectionRendererProps) {
  // Apply store-specific override if present
  const merged = mergeSectionData(section, sectionOverride);

  // If the store has disabled this section, skip rendering
  if (!merged.isEnabled) {
    return null;
  }

  // Convert merged data back to HomepageSection shape for existing components
  const effectiveSection = mergedToHomepageSection(merged);

  const isCore = themeCode === "core";

  switch (effectiveSection.type) {
    case "hero":
      if (isCore) {
        return null; // The premium reference site skips the hero entirely to focus on products.
      }
      return (
        <HeroSection
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
          titleClassName={heroTitleClassName}
          subtitleClassName={heroSubtitleClassName}
        />
      );
    case "featured_products":
      if (isCore) {
        return <CoreFeaturedProducts.component settings={effectiveSection as any} products={products} />;
      }
      return (
        <FeaturedProducts
          section={effectiveSection}
          settings={settings}
          products={products}
          className={sectionClassName}
        />
      );
    case "category_grid":
      return (
        <CategoryGrid
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
        />
      );
    case "image_with_text":
      return (
        <ImageWithText
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
        />
      );
    case "testimonials":
      return (
        <Testimonials
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
        />
      );
    case "newsletter":
      return (
        <Newsletter
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
        />
      );
    case "rich_text":
      return (
        <RichText
          section={effectiveSection}
          settings={settings}
          className={sectionClassName}
        />
      );
    default:
      return null;
  }
}
