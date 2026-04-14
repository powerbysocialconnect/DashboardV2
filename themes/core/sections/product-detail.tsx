"use client";

import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Heart, Share2 } from 'lucide-react';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';
import { useCart } from '../../../packages/pixeo-theme-sdk/src/hooks/useCart';

const ProductDetail = defineSection<{ showBreadcrumbs?: boolean } & { product?: any }>(
  {
    name: 'Product Details',
    settings: [
      { id: 'showBreadcrumbs', type: 'checkbox', label: 'Show Breadcrumbs', default: false },
    ],
  },
  (({ settings, product }) => {
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);

    // Fallback if no product is passed
    if (!product) return null;

    const mainImage = product.image_urls?.[0] || product.images?.[0] || 'https://via.placeholder.com/1200x1600';
    const isSoldOut = product.stock !== undefined && product.stock <= 0;

    const handleAddToCart = () => {
      addItem({
        id: product.id,
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: mainImage
      });
    };

    return (
      <section className="bg-white lg:min-h-[calc(100vh-80px)]">
        <div className="flex flex-col lg:flex-row w-full h-full">
          
          {/* Left: Edge-to-Edge Image (50% split) */}
          <div className="w-full lg:w-1/2 bg-gray-50 aspect-[3/4] lg:aspect-auto h-auto lg:h-[calc(100vh-80px)] lg:sticky lg:top-20">
             <img 
               src={mainImage} 
               alt={product.name} 
               className="w-full h-full object-cover" 
             />
          </div>

          {/* Right: Details (50% split) */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 lg:p-16 xl:p-24 bg-white">
            
            {/* Top Navigation / Brand */}
            <div className="mb-16 lg:mb-32 flex justify-between items-start">
               <a href="/" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors flex items-center gap-2">
                 ← Back to Products
               </a>
            </div>

            {/* Core Info */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl xl:text-7xl font-bold tracking-tighter uppercase leading-[0.9] text-gray-900">
                {product.name}
              </h1>
              <div className="pt-4">
                <span className="text-xl lg:text-2xl font-serif text-gray-500">
                  ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'} CAD
                </span>
              </div>
            </div>

            {/* Spacing push */}
            <div className="flex-1 my-12 lg:my-0">
               {product.description && (
                 <div className="max-w-md mt-8 lg:mt-16">
                    <p className="text-sm leading-relaxed text-gray-500 font-medium">
                      {product.description}
                    </p>
                 </div>
               )}
            </div>

            {/* Actions Bottom */}
            <div className="space-y-4 mt-auto">
               <button 
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="w-full bg-black text-white py-6 lg:py-8 text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center px-8"
               >
                  <span>{isSoldOut ? 'Sold Out' : 'Add to Cart'}</span>
                  {!isSoldOut && <span>${typeof product.price === 'number' ? (product.price * quantity).toFixed(2) : '0.00'}</span>}
               </button>
            </div>

          </div>
        </div>
      </section>
    );
  })
);

export default ProductDetail;
