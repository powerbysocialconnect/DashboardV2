"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/currency';
import ProductActions from './ProductActions';
import { Badge } from '@/components/ui/badge';
import { 
  hasVariants, 
  resolvePrice, 
  resolveCompareAtPrice, 
  resolveInventory, 
  resolveImage, 
  resolveSKU,
  isSoldOut
} from '@/lib/commerce/productUtils';

interface ProductDetailViewProps {
  product: any;
  store: any;
  subdomain: string;
}

export default function ProductDetailView({ product, store, subdomain }: ProductDetailViewProps) {
  // Map option groups for easier access
  const optionGroups = useMemo(() => {
    return (product.product_option_groups || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((og: any) => ({
        id: og.id,
        name: og.name,
        values: (og.product_option_values || []).map((ov: any) => ({
          id: ov.id,
          value: ov.value,
        })),
      }));
  }, [product.product_option_groups]);

  // Map variants for easier matching
  const variants = useMemo(() => {
    return (product.product_variants || []).map((v: any) => {
      const optionValues: Record<string, string> = {};
      (v.product_variant_options || []).forEach((vo: any) => {
        const optionValue = vo.product_option_values;
        if (!optionValue) return;

        const group = (optionGroups as any[]).find(
          (og: any) => og.id === optionValue.option_group_id
        );
        if (group) {
          // Store keys and values in lowercase and trimmed for reliable matching
          optionValues[group.name.toLowerCase().trim()] = optionValue.value.toLowerCase().trim();
        }
      });

      return {
        ...v,
        optionValues,
      };
    });
  }, [product.product_variants, optionGroups]);

  // Initial selection: default variant or first variant or empty record
  const initialSelection = useMemo(() => {
    if (!hasVariants(product)) return {};

    const defaultVar = (variants as any[]).find((v: any) => v.is_default) || variants[0];
    if (defaultVar) return defaultVar.optionValues;
    
    const initial: Record<string, string> = {};
    (optionGroups as any[]).forEach((og: any) => {
      const key = og.name.toLowerCase().trim();
      if (og.values.length > 0) initial[key] = og.values[0].value.toLowerCase().trim();
    });
    return initial;
  }, [variants, optionGroups, product]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialSelection);

  // Keep selected options in sync if product changes (e.g. client-side navigation)
  useEffect(() => {
    setSelectedOptions(initialSelection);
  }, [initialSelection]);

  // Find matching variant
  const selectedVariant = useMemo(() => {
    if (!hasVariants(product)) return null;
    return (variants as any[]).find((v: any) => 
      Object.entries(selectedOptions).every(([name, value]) => {
        const key = name.toLowerCase().trim();
        const targetValue = value.toLowerCase().trim();
        return v.optionValues[key] === targetValue;
      })
    );
  }, [variants, selectedOptions, product]);

  // Determine current image, price, and stock using resolution helpers
  const currentPrice = resolvePrice(product, selectedVariant);
  const currentCompareAtPrice = resolveCompareAtPrice(product, selectedVariant);
  const currentStock = resolveInventory(product, selectedVariant);
  const currentImage = resolveImage(product, selectedVariant);
  const isProductSoldOut = isSoldOut(product, selectedVariant);
  const currentSKU = resolveSKU(product, selectedVariant);

  const hasDiscount = currentCompareAtPrice && currentCompareAtPrice > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((currentCompareAtPrice! - currentPrice) / currentCompareAtPrice!) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      {/* Top Navigation */}
      <div className="mb-8">
         <Link 
           href={subdomain ? `/store/${subdomain}/collections/all` : "/collections/all"} 
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
               src={currentImage} 
               alt={product.name} 
               className="w-full h-full object-cover transition-all duration-500"
             />
             {isProductSoldOut && (
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
              {product.name}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-black tabular-nums">
                {formatPrice(currentPrice, store.currency || 'USD')} {store.currency || 'USD'}
              </p>
              {hasDiscount && (
                <>
                  <p className="text-lg text-gray-400 line-through tabular-nums">
                    {formatPrice(currentCompareAtPrice, store.currency || 'USD')}
                  </p>
                  <Badge className="bg-red-50 text-red-600 border-none">-{discountPercent}%</Badge>
                </>
              )}
            </div>
            {currentSKU && (
              <p className="text-[10px] text-gray-400 mt-2 tracking-widest uppercase">SKU: {currentSKU}</p>
            )}
          </div>

          <div className="space-y-10">
            {/* Options Selection */}
            {hasVariants(product) && optionGroups.length > 0 && (
              <div className="space-y-6">
                {(optionGroups as any[]).map((group: any) => (
                  <div key={group.id} className="space-y-3">
                    <h3 className="text-[13px] font-bold text-black uppercase tracking-wider">{group.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(group.values as any[]).map((val: any) => {
                        const key = group.name.toLowerCase().trim();
                        const valLower = val.value.toLowerCase().trim();
                        const isSelected = selectedOptions[key] === valLower;
                        return (
                          <button
                            key={val.id}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: valLower }))}
                            className={`px-4 py-2 text-[12px] font-medium border transition-all rounded-md ${
                              isSelected 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-gray-900 border-gray-200 hover:border-black'
                            }`}
                          >
                            {val.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-black">Description</h3>
              <p className="text-[14px] leading-relaxed text-gray-500">
                {product.description || "The piece is characterized by its high-quality construction and minimalist design, perfect for an elevated daily wardrobe."}
              </p>
            </div>

            {/* Actions Section */}
            <div className="pt-8 border-t border-black/[0.05]">
               <ProductActions 
                 product={product}
                 selectedVariant={selectedVariant}
                 currentPrice={currentPrice}
                 isSoldOut={isProductSoldOut}
                 currency={store.currency || 'USD'} 
               />
               
               <div className="mt-8 pt-8 border-t border-black/[0.05]">
                  <p className="text-[12px] text-gray-400">
                  Categories: <span className="text-gray-500 font-medium">
                      {(() => {
                        const pcs = product.product_categories || [];
                        if (pcs.length > 0) {
                          return pcs.map((pc: any) => pc.categories?.name).filter(Boolean).join(", ");
                        }
                        return product.categories?.name || 'Uncategorized';
                      })()}
                    </span>
                  </p>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
