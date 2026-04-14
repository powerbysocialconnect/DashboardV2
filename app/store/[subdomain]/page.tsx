import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveStorefront } from "@/lib/storefront/resolveStoreConfig";
import ThemeRenderer from "@/components/themes/ThemeRenderer";
import { formatCurrency } from "@/lib/utils";
import type { Product, ThemeSettings } from "@/types/database";

interface PageProps {
  params: { subdomain: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) {
    return { title: "Store Not Found" };
  }

  const { config } = storefront;
  return {
    title: `${config.store.name}`,
    description: config.store.description || `Shop at ${config.store.name}`,
    openGraph: {
      title: config.store.name,
      description: config.store.description || `Shop at ${config.store.name}`,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();
  
  console.log(`[DIAGNOSTIC] StorefrontPage Rendering for: ${params.subdomain}`);
  const storefront = await resolveStorefront(supabase, params.subdomain);
  
  if (!storefront) {
    console.log(`[DIAGNOSTIC] Storefront NOT FOUND: ${params.subdomain}`);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold">Storefront Not Found (Diagnostic)</h1>
      </div>
    );
  }

  const { config, products, categories, headerPages, footerPages } = storefront;
  const themeToUse = config.themeConfig?.theme_code || "core";
  
  console.log(`[DIAGNOSTIC] Storefront Found. Theme: ${themeToUse}. Products: ${products.length}`);

  return (
    <ThemeRenderer
      themeCode={themeToUse as any}
      settings={config.effectiveThemeSettings}
      sections={config.effectiveHomepageLayout}
      sectionOverrides={config.sectionOverrides}
      products={products}
      store={{
        ...config.store,
        currency: config.store.currency || 'USD',
      }}
      categories={categories}
      headerPages={headerPages}
      footerPages={footerPages}
    />
  );
}

