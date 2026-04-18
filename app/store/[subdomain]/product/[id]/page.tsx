import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Product, ThemeSettings } from "@/types/database";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import ProductDetailView from "./ProductDetailView";

interface PageProps {
  params: { subdomain: string; id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("subdomain", params.subdomain)
    .single();

  if (!store) return { title: "Product Not Found" };

  const { data: product } = await supabase
    .from("products")
    .select("name, description, image_urls")
    .eq("id", params.id)
    .eq("store_id", store.id)
    .single();

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} | ${store.name}`,
    description: product.description || `${product.name} - Shop at ${store.name}`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.image_urls?.[0] ? [product.image_urls[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("subdomain", params.subdomain)
    .single();

  if (!store) notFound();

  const [{ data: product }, { data: products }, { data: headerPages }, { data: footerPages }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        categories(name),
        product_categories(categories(name)),
        product_option_groups(
          id,
          name,
          position,
          product_option_values(id, value)
        ),
        product_variants(
          id,
          sku,
          price,
          stock,
          image_url,
          active,
          is_default,
          product_variant_options(
            option_value_id,
            product_option_values(id, value, option_group_id)
          )
        )
      `)
      .eq("id", params.id)
      .eq("store_id", store.id)
      .eq("active", true)
      .single(),
    supabase
      .from("products")
      .select("*")
      .eq("store_id", store.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("store_pages")
      .select("title, slug")
      .eq("store_id", store.id)
      .eq("is_published", true)
      .eq("show_in_header", true)
      .order("nav_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("store_pages")
      .select("title, slug")
      .eq("store_id", store.id)
      .eq("is_published", true)
      .eq("show_in_footer", true)
      .order("footer_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!product) notFound();

  return (
    <CoreLayout 
      store={store} 
      currency={store.currency || 'USD'} 
      products={products || []}
      headerPages={(headerPages || []) as any}
      footerPages={(footerPages || []) as any}
    >
      <ProductDetailView 
        product={product} 
        store={store} 
        subdomain={params.subdomain} 
      />
    </CoreLayout>
  );
}
