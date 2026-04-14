import type {
  HomepageSection,
  Product,
  ThemeSettings,
} from "@/types/database";
import ThemeRenderer, { type ThemeClasses } from "../ThemeRenderer";

interface MaintenanceThemeProps {
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

const maintenanceClasses: ThemeClasses = {
  wrapper: "bg-white",
  header: "hidden",
  headerInner: "",
  storeName: "",
  nav: "hidden",
  navLink: "",
  main: "flex items-center justify-center min-h-screen",
  sectionWrapper: "",
  footer: "hidden",
  footerInner: "",
};

export default function MaintenanceTheme({
  settings,
  sections,
  products,
  store,
  socialLinks,
}: MaintenanceThemeProps) {
  // Overriding sections to show a maintenance message
  const maintenanceSections: HomepageSection[] = [
    {
      type: "hero",
      title: "Coming Soon",
      subtitle: `${store.name} is currently under maintenance. Please check back later.`,
    }
  ];

  return (
    <ThemeRenderer
      themeCode="maintenance"
      settings={settings}
      sections={maintenanceSections}
      products={[]}
      store={store}
      classes={maintenanceClasses}
      socialLinks={socialLinks}
    />
  );
}
