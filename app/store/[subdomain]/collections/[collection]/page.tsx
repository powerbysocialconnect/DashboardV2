import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveStorefront } from "@/lib/storefront/resolveStoreConfig";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CollectionPageProps {
  params: { subdomain: string; collection: string };
  searchParams: { page?: string };
}

const ITEMS_PER_PAGE = 12;

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) return { title: "Store Not Found" };

  const collectionName = params.collection === "all" ? "Shop All" : params.collection;
  return {
    title: `${collectionName} — ${storefront.config.store.name}`,
    description: `Browse our ${collectionName} collection at ${storefront.config.store.name}.`,
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) notFound();

  const { config, headerPages, footerPages } = storefront;
  const store = config.store;
  const currentPage = parseInt(searchParams.page || "1") || 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch paginated products
  let query = supabase
    .from("products")
    .select("*, product_categories!inner(category_id)", { count: "exact" })
    .eq("store_id", store.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (params.collection !== "all") {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("store_id", store.id)
      .ilike("slug", params.collection)
      .single();

    if (category) {
      query = query.eq("product_categories.category_id", category.id);
    } else {
      // If collection slug doesn't exist as a category, return empty or notFound
      return notFound();
    }
  } else {
    // If "all", we still need to join but without the filter, OR we can use a different select
    // To handle "all" without needing product_categories entries (backwards compatibility), 
    // we use a simpler select if collection is "all"
    query = supabase
      .from("products")
      .select("*, product_categories(category_id)", { count: "exact" })
      .eq("store_id", store.id)
      .eq("active", true)
      .order("created_at", { ascending: false });
  }

  const { data: products, count } = await query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const totalProducts = count || 0;
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  // Get collection title
  let collectionTitle = "Shop All";
  if (params.collection !== "all") {
    const { data: cat } = await supabase
      .from("categories")
      .select("name")
      .ilike("slug", params.collection)
      .single();
    if (cat) collectionTitle = cat.name;
  }

  return (
    <CoreLayout
      store={{
        ...store,
        currency: store.currency || "USD",
      }}
      currency={store.currency || "USD"}
      products={[]} // We don't need all products for search overlay here if we want to save bandwidth, or pass them if needed
      headerPages={headerPages}
      footerPages={footerPages}
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-12 md:py-24">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl text-center">
            {collectionTitle}
          </h1>
          <p className="mt-4 text-center text-gray-400 text-[12px] uppercase tracking-[0.2em]">
            Showing {products?.length || 0} of {totalProducts} Products
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-16 lg:gap-y-24">
          {products && products.length > 0 ? (
            products.map((product) => (
              <ProductItem key={product.id} product={product} currency={store.currency || "USD"} subdomain={params.subdomain} />
            ))
          ) : (
            <div className="col-span-full py-40 text-center border-t border-black/[0.05]">
              <p className="text-gray-300 font-serif text-2xl italic tracking-wide">
                No products found in this collection.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-24 flex items-center justify-center gap-8 border-t border-black/[0.05] pt-12">
            {currentPage > 1 ? (
              <Link
                href={`/store/${params.subdomain}/collections/${params.collection}?page=${currentPage - 1}`}
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] hover:text-gray-500 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-200 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}

            <div className="flex items-center gap-4">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === currentPage;
                return (
                  <Link
                    key={pageNum}
                    href={`/store/${params.subdomain}/collections/${params.collection}?page=${pageNum}`}
                    className={`text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                      isCurrent ? "text-black border-b-2 border-black pb-1" : "text-gray-300 hover:text-black"
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
            </div>

            {currentPage < totalPages ? (
              <Link
                href={`/store/${params.subdomain}/collections/${params.collection}?page=${currentPage + 1}`}
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] hover:text-gray-500 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-200 cursor-not-allowed">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </CoreLayout>
  );
}

/**
 * Local ProductItem component to match the Core theme aesthetic perfectly.
 */
function ProductItem({ product, currency, subdomain }: { product: Product; currency: string; subdomain: string }) {
  const images = (product.image_urls as string[]) || [];
  const mainImage = images[0] || "/placeholder-product.png";
  const hoverImage = images[1] || mainImage;
  const isOutOfStock = (product.stock ?? 0) <= 0;

  return (
    <Link href={`/store/${subdomain}/product/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-6">
        {/* Images */}
        <img
          src={mainImage}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${hoverImage !== mainImage ? 'group-hover:opacity-0' : ''}`}
        />
        {hoverImage !== mainImage && (
          <img
            src={hoverImage}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
          />
        )}

        {/* Badges */}
        {isOutOfStock && (
          <div className="absolute top-4 left-4">
            <span className="bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-black">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-[13px] font-bold uppercase tracking-tight text-black group-hover:text-gray-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-[12px] text-gray-500 font-medium">
          {formatCurrency(product.price, currency)}
        </p>
      </div>
    </Link>
  );
}
