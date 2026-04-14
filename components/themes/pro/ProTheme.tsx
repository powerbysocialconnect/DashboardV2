import type {
  HomepageSection,
  Product,
  ThemeSettings,
} from "@/types/database";
import ThemeRenderer, { type ThemeClasses } from "../ThemeRenderer";

interface ProThemeProps {
  settings: ThemeSettings;
  sections: HomepageSection[];
  products: Product[];
  store: {
    name: string;
    logo_url?: string | null;
    description?: string | null;
  };
  socialLinks?: { label: string; url: string }[];
}

const proClasses: ThemeClasses = {
  wrapper: "[&_*]:transition-all [&_*]:duration-300",
  header: "border-b border-gray-200/50",
  headerInner: "max-w-6xl py-6",
  storeName: "text-2xl font-light tracking-[0.2em] uppercase",
  nav: "gap-10",
  navLink: "text-xs uppercase tracking-[0.15em] font-normal text-gray-500 hover:text-gray-800",
  main: "",
  sectionWrapper: "py-20 md:py-32",
  footer: "",
  footerInner: "max-w-6xl py-16",
  heroTitleOverride: "text-4xl md:text-5xl lg:text-7xl font-light tracking-wide",
  heroSubtitleOverride: "text-base md:text-lg font-light tracking-wider text-white/70",
};

export default function ProTheme({
  settings,
  sections,
  products,
  store,
  socialLinks,
}: ProThemeProps) {
  const proSettings: ThemeSettings = {
    ...settings,
    headingFont: settings.headingFont || "Inter, sans-serif",
    bodyFont: settings.bodyFont || "Inter, sans-serif",
  };

  return (
    <ThemeRenderer
      themeCode="pro"
      settings={proSettings}
      sections={sections}
      products={products}
      store={store}
      classes={proClasses}
      socialLinks={socialLinks}
    />
  );
}
