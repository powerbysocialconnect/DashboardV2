import type {
  HomepageSection,
  Product,
  ThemeSettings,
} from "@/types/database";
import ThemeRenderer, { type ThemeClasses } from "../ThemeRenderer";

interface StarterThemeProps {
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

const starterClasses: ThemeClasses = {
  wrapper: "",
  header: "bg-white/95",
  headerInner: "py-3",
  storeName: "text-lg",
  nav: "",
  navLink: "text-sm",
  main: "",
  sectionWrapper: "",
  footer: "",
  footerInner: "py-10",
};

export default function StarterTheme({
  settings,
  sections,
  products,
  store,
  socialLinks,
}: StarterThemeProps) {
  return (
    <ThemeRenderer
      themeCode="starter"
      settings={settings}
      sections={sections}
      products={products}
      store={store}
      classes={starterClasses}
      socialLinks={socialLinks}
    />
  );
}
