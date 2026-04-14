import type {
  HomepageSection,
  Product,
  ThemeSettings,
} from "@/types/database";
import ThemeRenderer, { type ThemeClasses } from "../ThemeRenderer";

interface StoreThemeProps {
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

const storeClasses: ThemeClasses = {
  wrapper: "bg-gray-50",
  header: "border-b bg-white",
  headerInner: "py-4",
  storeName: "text-2xl font-black tracking-tight",
  nav: "",
  navLink: "text-sm font-semibold",
  main: "pb-20",
  sectionWrapper: "py-12",
  footer: "bg-gray-900",
  footerInner: "py-12",
};

export default function StoreTheme({
  settings,
  sections,
  products,
  store,
  socialLinks,
}: StoreThemeProps) {
  return (
    <ThemeRenderer
      themeCode="store"
      settings={settings}
      sections={sections}
      products={products}
      store={store}
      classes={storeClasses}
      socialLinks={socialLinks}
    />
  );
}
