"use client";

import React from 'react';
import { CoreLayout } from './core/CoreLayout';
import { formatPrice } from '@/lib/currency';
import { ThemeSectionRenderer } from './sections/SectionRenderer';

export interface ThemeClasses {
  wrapper?: string;
  header?: string;
  headerInner?: string;
  storeName?: string;
  nav?: string;
  navLink?: string;
  main?: string;
  sectionWrapper?: string;
  footer?: string;
  footerInner?: string;
  heroTitleOverride?: string;
  heroSubtitleOverride?: string;
}

/**
 * PRODUCT CARD
 */
function ProductCard({ product, currency, subdomain = "" }: { product: any, currency: string, subdomain?: string }) {
  const mainImage = product.image_urls?.[0] || product.images?.[0] || 'https://via.placeholder.com/600x800?text=No+Image';
  const isSoldOut = product.stock !== undefined && product.stock <= 0;

  return (
    <a href={subdomain ? `/store/${subdomain}/product/${product.id}` : `/product/${product.id}`} className="group block cursor-pointer">
      <div className="relative w-full overflow-hidden rounded-[20px] bg-white transition-all duration-500 group-hover:shadow-xl">
        <img 
          src={mainImage} 
          alt={product.name} 
          className="w-full h-auto min-h-[300px] object-contain md:object-cover transition-transform duration-1000 group-hover:scale-105" 
        />
        {isSoldOut && (
          <div className="absolute top-4 left-4">
            <span className="bg-black/90 backdrop-blur-md px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-white rounded-lg">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-col items-center text-center px-2">
        <h3 className="text-[14px] font-bold uppercase tracking-tight text-gray-900 leading-tight mb-2 group-hover:underline underline-offset-4">
          {product.name}
        </h3>
        <p className="text-[15px] font-black text-black tabular-nums">
          {formatPrice(product.price, currency)}
        </p>
      </div>
    </a>
  );
}

export default function ThemeRenderer({
  store,
  products = [],
  sections = [],
  headerPages = [],
  footerPages = [],
}: any) {
  const currency = store?.currency || 'USD';
  const subdomain = store?.subdomain;

  return (
    <CoreLayout store={store} currency={currency} products={products} headerPages={headerPages} footerPages={footerPages}>
      <section className="max-w-[1600px] mx-auto py-12 md:py-24 px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-16 lg:gap-y-24">
          {products.length > 0 ? (
            products.slice(0, 12).map((product: any) => (
              <ProductCard key={product.id} product={product} currency={currency} subdomain={subdomain} />
            ))
          ) : (
            <div className="col-span-full py-40 text-center border-t border-black/[0.05]">
              <p className="text-gray-300 font-serif text-2xl italic tracking-wide">No products found.</p>
            </div>
          )}
        </div>
      </section>
    </CoreLayout>
  );
}

