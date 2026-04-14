"use client";

import React from 'react';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';
import { ShoppingBag } from 'lucide-react';

interface ProductGridSettings {
  title: string;
  columns: number;
  limit: number;
}

const FeaturedProducts = defineSection<{ title: string; columns: number } & { products?: any[] }>(
  {
    name: 'Featured Products',
    settings: [
      { id: 'title', type: 'text', label: 'Section Title', default: '' },
      { id: 'columns', type: 'number', label: 'Columns (Desktop)', default: 4 },
    ],
  },
  ({ settings, products }) => {
    // Fallback if the platform hasn't passed products down yet
    const displayProducts = products && products.length > 0 ? products : [];

    return (
      <section className="bg-white w-full">
        {/* Optional Title - The reference often has none, but keeping for flexibility */}
        {settings?.title && (
          <div className="text-center mb-16">
             <h2 className="text-2xl font-serif tracking-[0.05em] uppercase text-gray-900">
               {settings.title}
             </h2>
          </div>
        )}

        {/* 4-Column Edge-to-Edge Grid (DSN Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 px-4 lg:px-6">
          {displayProducts.map((product: any) => {
            // Robust image retrieval (handles both V1 array of strings and V2 schema)
            const mainImage = product.image_urls?.[0] || product.images?.[0] || 'https://via.placeholder.com/600x800?text=No+Image';
            const isSoldOut = product.stock !== undefined && product.stock <= 0;

            return (
              <a key={product.id} href={`/store/product/${product.id}`} className="group block cursor-pointer">
                {/* Image Container with subtle rounding matching reference */}
                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4 rounded-md">
                  <img 
                    src={mainImage} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-105" 
                  />
                  
                  {/* Minimalist Black Pill Badge (Bottom-Left matching reference) */}
                  {isSoldOut && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-[#111] px-2 py-1 text-[10px] uppercase font-semibold text-white rounded shadow-sm leading-none">
                        Sold out
                      </span>
                    </div>
                  )}
                </div>

                {/* Info (Centered, ultra minimal) */}
                <div className="flex flex-col items-center text-center space-y-1 mt-6">
                  <h3 className="text-[11px] font-medium tracking-wide text-gray-800 transition-colors group-hover:text-gray-500">
                    {product.name}
                  </h3>
                  <div className="flex items-center">
                    <span className="text-[11px] font-semibold text-gray-900">
                      ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'} CAD
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Empty State Guard */}
        {displayProducts.length === 0 && (
          <div className="py-32 text-center border-t border-gray-100 mt-20">
             <p className="text-gray-400 font-serif text-xl italic">No products available.</p>
          </div>
        )}
      </section>
    );
  }
);

export default FeaturedProducts;
