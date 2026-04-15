import { SupabaseClient } from "@supabase/supabase-js";
import type { Store, StoreThemeConfig, Product } from "@/types/database";
import { getStoreConfigBySubdomain, type StoreConfig } from "@/lib/stores/getStoreConfig";

export interface NavPageData {
  title: string;
  slug: string;
}

export interface StorefrontData {
  config: StoreConfig;
  products: Product[];
  categories: { id: string; name: string; slug: string }[];
  headerPages: NavPageData[];
  footerPages: NavPageData[];
}

export async function resolveStorefront(
  supabase: SupabaseClient,
  subdomain: string
): Promise<StorefrontData | null> {
  const config = await getStoreConfigBySubdomain(supabase, subdomain);

  if (!config) return null;

  // Check if store is disabled — respect existing V1/V2 behavior
  if (config.store.is_disabled) return null;

  const [productsRes, categoriesRes, headerPagesRes, footerPagesRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("store_id", config.store.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("store_id", config.store.id)
      .order("name"),
    supabase
      .from("store_pages")
      .select("title, slug")
      .eq("store_id", config.store.id)
      .eq("is_published", true)
      .eq("show_in_header", true)
      .order("nav_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("store_pages")
      .select("title, slug")
      .eq("store_id", config.store.id)
      .eq("is_published", true)
      .eq("show_in_footer", true)
      .order("footer_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return {
    config,
    products: (productsRes.data || []) as Product[],
    categories: categoriesRes.data || [],
    headerPages: (headerPagesRes.data || []) as NavPageData[],
    footerPages: (footerPagesRes.data || []) as NavPageData[],
  };
}

