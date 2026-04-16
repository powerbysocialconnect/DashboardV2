import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Product, ThemeSettings } from "@/types/database";
import ProductActions from "./ProductActions";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { formatPrice } from "@/lib/currency";
import { UIProvider } from "@/packages/pixeo-theme-sdk/src/hooks/useUI";

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
      .select("*, categories(name), product_categories(categories(name))")
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

  const typedProduct = product as Product;

  const { data: themeConfig } = await supabase
    .from("store_theme_configs")
    .select("*")
    .eq("store_id", store.id)
    .single();

  const defaultTheme: ThemeSettings = {
    primaryColor: "#111111",
    accentColor: "#D4AF37",
    backgroundColor: "#FFFFFF",
    headingFont: "Inter",
    bodyFont: "Inter",
    buttonStyle: "rounded",
    logoAlignment: "left",
  };
  const theme: ThemeSettings = themeConfig?.theme_settings
    ? { ...defaultTheme, ...(themeConfig.theme_settings as ThemeSettings) }
    : defaultTheme;

  const buttonRadius =
    theme.buttonStyle === "pill"
      ? "rounded-full"
      : theme.buttonStyle === "square"
        ? "rounded-none"
        : "rounded-lg";

  const hasDiscount =
    typedProduct.compare_at_price &&
    typedProduct.compare_at_price > typedProduct.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((typedProduct.compare_at_price! - typedProduct.price) /
          typedProduct.compare_at_price!) *
          100
      )
    : 0;

  return (
    <CoreLayout 
      store={store} 
      currency={store.currency || 'USD'} 
      products={products || []}
      headerPages={(headerPages || []) as any}
      footerPages={(footerPages || []) as any}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Top Navigation */}
        <div className="mb-8">
           <Link 
             href={params.subdomain ? `/store/${params.subdomain}/collections/all` : "/collections/all"} 
             className="text-[13px] font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-2 group"
           >
             <span className="group-hover:-translate-x-1 transition-transform inline-block">‹</span> Back to All Products
           </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* LEFT: Image Gallery */}
          <div className="w-full lg:w-1/2">
             <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] shadow-sm bg-gray-50">
               <img 
                 src={typedProduct.image_urls?.[0] || 'https://via.placeholder.com/1200x1600'} 
                 alt={typedProduct.name} 
                 className="w-full h-full object-cover"
               />
               {typedProduct.stock !== undefined && typedProduct.stock <= 0 && (
                 <div className="absolute top-6 left-6">
                   <span className="bg-black text-white px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md">
                     Sold Out
                   </span>
                 </div>
               )}
             </div>
          </div>

          {/* RIGHT: Content Cluster */}
          <div className="w-full lg:w-1/2 flex flex-col pt-4">
            
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                {typedProduct.name}
              </h1>
              <p className="text-2xl font-bold text-black tabular-nums">
                {formatPrice(typedProduct.price, store.currency || 'USD')} {store.currency || 'USD'}
              </p>
            </div>

            <div className="space-y-10">
              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-[15px] font-bold text-black">Description</h3>
                <p className="text-[14px] leading-relaxed text-gray-500">
                  {typedProduct.description || "The piece is characterized by its high-quality construction and minimalist design, perfect for an elevated daily wardrobe."}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <h3 className="text-[15px] font-bold text-black">Features</h3>
                <ul className="space-y-2">
                   {[
                     "Premium quality material",
                     "Sustainably sourced",
                     "Ethically made",
                     "Comfortable fit"
                   ].map((feature, i) => (
                     <li key={i} className="flex items-start gap-3 text-[14px] text-gray-500">
                       <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full shrink-0" />
                       {feature}
                     </li>
                   ))}
                </ul>
              </div>

              {/* Actions Section */}
              <div className="pt-8 border-t border-black/[0.05]">
                 <ProductActions 
                   product={typedProduct} 
                   currency={store.currency || 'USD'} 
                 />
                 
                 <div className="mt-8 pt-8 border-t border-black/[0.05]">
                    <p className="text-[12px] text-gray-400">
                    Categories: <span className="text-gray-500 font-medium">
                        {(() => {
                          const p = product as any;
                          const pcs = p.product_categories || [];
                          if (pcs.length > 0) {
                            return pcs.map((pc: any) => pc.categories?.name).filter(Boolean).join(", ");
                          }
                          return p.categories?.name || 'Uncategorized';
                        })()}
                      </span>
                    </p>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </CoreLayout>
  );
}
