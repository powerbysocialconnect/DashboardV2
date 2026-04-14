"use client";

import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/packages/pixeo-theme-sdk/src/hooks/useCart';
import { useUI } from '@/packages/pixeo-theme-sdk/src/hooks/useUI';
import { formatPrice } from '@/lib/currency';

interface ProductActionsProps {
  product: any;
  currency: string;
}

export default function ProductActions({ product, currency }: ProductActionsProps) {
  const { addItem } = useCart();
  const { openCart } = useUI();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const mainImage = product.image_urls?.[0] || product.images?.[0] || 'https://via.placeholder.com/600x800';
  const isSoldOut = product.stock !== undefined && product.stock <= 0;

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
      quantity: quantity
    });
    
    // Smooth transition to show success before opening drawer
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <span className="text-[14px] font-bold text-black">Quantity</span>
        <div className="flex items-center w-full max-w-[120px] border border-black/[0.1] h-10 rounded-sm">
          <button 
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full border-r border-black/[0.1]"
            disabled={quantity <= 1}
          >
            <Minus className="w-3 h-3 text-black" />
          </button>
          <span className="flex-1 text-center text-[13px] font-bold tabular-nums">
            {quantity}
          </span>
          <button 
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full border-l border-black/[0.1]"
          >
            <Plus className="w-3 h-3 text-black" />
          </button>
        </div>
      </div>

      <button 
        type="button"
        onClick={handleAddToCart}
        disabled={isSoldOut || isAdding}
        className="w-full h-12 bg-black text-white text-[13px] font-bold transition-all hover:bg-black/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-10"
      >
        <span>{isAdding ? 'Adding...' : isSoldOut ? 'Sold Out' : `Add to Cart - ${formatPrice(product.price * quantity, currency)} ${currency}`}</span>
      </button>
    </div>
  );
}
