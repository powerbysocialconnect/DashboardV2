"use client";

import React from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/currency';

interface ProductCardProps {
  product: any;
  currency: string;
  subdomain?: string;
}

function ProductCard({ product, currency, subdomain = "" }: ProductCardProps) {
  const mainImage = product.image_urls?.[0] || product.images?.[0] || 'https://via.placeholder.com/600x800?text=No+Image';
  const isSoldOut = product.stock !== undefined && product.stock <= 0;

  return (
    <Link href={subdomain ? `/store/${subdomain}/product/${product.id}` : `/product/${product.id}`} className="group block cursor-pointer">
      <div className="relative w-full overflow-hidden rounded-[20px] bg-white transition-all duration-500 group-hover:shadow-xl">
        <img 
          src={mainImage} 
          alt={product.name} 
          className="w-full h-auto min-h-[300px] object-contain md:object-cover transition-transform duration-1000 group-hover:scale-105" 
        />
        {isSoldOut && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-black/90 backdrop-blur-md px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-white rounded-lg shadow-sm">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-col items-center text-center px-2">
        <h3 className="text-[14px] font-bold uppercase tracking-tight text-gray-900 leading-tight mb-1 group-hover:underline underline-offset-4">
          {product.name}
        </h3>
        <p className="text-[15px] font-black text-black tabular-nums">
          {formatPrice(product.price, currency)}
        </p>
      </div>
    </Link>
  );
}

export function FeaturedProducts({ 
  settings = {}, 
  products = [], 
  currency = 'USD',
  subdomain = ""
}: any) {
  const heading = settings.heading || "Featured Products";
  const limit = parseInt(settings.limit, 10) || 8;
  const columns = parseInt(settings.columns) || 4;
  const sourceType = settings.sourceType || (settings.categoryId ? "category" : "latest");
  const categoryId = settings.categoryId;
  const productIds = Array.isArray(settings.productIds) ? settings.productIds : [];
  const sortBy = settings.sortBy || "newest";
  const ctaLabel = settings.ctaLabel || "View All";
  const ctaLink = settings.ctaLink || (subdomain ? `/store/${subdomain}/collections/all` : '/collections/all');

  let filteredProducts = [...products];

  if (sourceType === "manual") {
    const byId = new Map(products.map((p: any) => [p.id, p]));
    filteredProducts = productIds
      .map((id: string) => byId.get(id))
      .filter(Boolean) as any[];
  } else if (sourceType === "category" && categoryId) {
    filteredProducts = products.filter((p: any) => {
      // Check legacy single category_id
      if (p.category_id === categoryId) return true;
      
      // Check multi-category junction data
      const pc = p.product_categories;
      if (Array.isArray(pc)) {
        return pc.some((link: any) => link.category_id === categoryId);
      }
      
      return false;
    });
  }

  const sortedProducts = [...filteredProducts];
  switch (sortBy) {
    case "oldest":
      sortedProducts.sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
      break;
    case "price_asc":
      sortedProducts.sort((a: any, b: any) => Number(a.price || 0) - Number(b.price || 0));
      break;
    case "price_desc":
      sortedProducts.sort((a: any, b: any) => Number(b.price || 0) - Number(a.price || 0));
      break;
    case "name_asc":
      sortedProducts.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
      break;
    case "newest":
    default:
      sortedProducts.sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
      break;
  }

  const displayProducts = sortedProducts.slice(0, limit);

  return (
    <section className="max-w-[1600px] mx-auto py-16 md:py-24 px-4 md:px-8 lg:px-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            {heading} 
          </h2>
          <div className="h-1 w-20 bg-black" />
        </div>
        {ctaLabel && (
          <Link 
            href={ctaLink}
            className="text-[12px] font-bold uppercase tracking-[0.2em] border-b-2 border-black pb-1 hover:opacity-50 transition-opacity"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${columns} gap-x-4 md:gap-x-8 gap-y-16 lg:gap-y-24`}>
        {displayProducts.length > 0 ? (
          displayProducts.map((product: any) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              currency={currency} 
              subdomain={subdomain} 
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-t border-black/[0.05]">
            <p className="text-gray-300 font-serif text-xl italic tracking-wide">No products found in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
}
