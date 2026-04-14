import type {
  HomepageSection,
  Product,
  ThemeSettings,
} from "@/types/database";
import ThemeRenderer, { type ThemeClasses } from "../ThemeRenderer";

interface PremiumThemeProps {
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

const premiumClasses: ThemeClasses = {
  wrapper: "",
  header: "border-b-2 border-gray-900/10",
  headerInner: "max-w-[1400px] py-5",
  storeName: "text-2xl uppercase tracking-widest",
  nav: "gap-8",
  navLink: "text-sm uppercase tracking-wider font-semibold",
  main: "",
  sectionWrapper: "",
  footer: "",
  footerInner: "max-w-[1400px] py-16",
  heroTitleOverride: "text-5xl md:text-6xl lg:text-8xl font-black uppercase tracking-tight",
  heroSubtitleOverride: "text-xl md:text-2xl font-light tracking-wide",
};

export default function PremiumTheme({
  settings,
  sections,
  products,
  store,
  socialLinks,
}: PremiumThemeProps) {
  return (
    <ThemeRenderer
      themeCode="premium"
      settings={settings}
      sections={sections}
      products={products}
      store={store}
      classes={premiumClasses}
      socialLinks={socialLinks}
    />
  );
}
