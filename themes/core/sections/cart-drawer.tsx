"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../../packages/pixeo-theme-sdk/src/hooks/useCart';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';
import { useUI } from '../../../packages/pixeo-theme-sdk/src/hooks/useUI';

const CartDrawer = defineSection(
  {
    name: 'Cart Drawer',
    settings: [
      { id: 'emptyText', type: 'text', label: 'Empty Cart Text', default: 'Your bag is empty.' },
    ],
  },
  ({ settings }) => {
    const { items, subtotal, itemCount, updateQuantity, removeItem } = useCart();
    const { isCartOpen, closeCart } = useUI();
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Lock scroll and handle escape key
    useEffect(() => {
      if (!mounted) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeCart();
      };

      if (isCartOpen) {
        window.addEventListener('keydown', handleEscape);
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.paddingRight = '0px';
        document.body.style.overflow = 'unset';
      }
      return () => {
        window.removeEventListener('keydown', handleEscape);
        document.body.style.paddingRight = '0px';
        document.body.style.overflow = 'unset';
      }
    }, [isCartOpen, mounted, closeCart]);

    if (!mounted) return null;

    // Use a portal to ensure the drawer is outside the main layout flow
    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!portalRoot) return null;

    const drawerContent = (
      <>
        {/* Backdrop */}
        <div 
          onClick={closeCart}
          className={`fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        />

        {/* Drawer Wrapper */}
        <div className={`fixed top-0 right-0 z-[510] w-full max-w-md h-full bg-white shadow-2xl transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
          <div className="flex flex-col h-full bg-white">
            
            {/* Drawer Header */}
            <div className="h-24 px-8 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Shopping Bag ({itemCount})</span>
              </div>
              <button 
                onClick={closeCart}
                className="p-2 -mr-2 hover:opacity-50 transition-opacity"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-8 py-10">
              {items.length > 0 ? (
                <div className="space-y-10">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-6">
                      <div className="w-20 lg:w-24 aspect-[3/4] bg-gray-50 flex-shrink-0 overflow-hidden rounded">
                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-tight line-clamp-2">{item.name}</h4>
                            <span className="text-xs font-medium ml-4">${item.price}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          {/* Quantity Selector */}
                          <div className="flex items-center border border-gray-200 rounded">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-3 text-xs font-bold">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-100 mb-6" />
                  <p className="text-gray-400 text-sm">{settings?.emptyText || 'Your bag is empty.'}</p>
                  <button 
                    onClick={closeCart}
                    className="mt-8 text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 hover:text-gray-500 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            {items.length > 0 && (
              <div className="p-8 border-t border-gray-100 space-y-6 bg-gray-50/50">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Estimated Total</span>
                   <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <button className="w-full bg-black text-white py-5 text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center gap-2 group">
                   Checkout Now
                </button>
                <p className="text-[10px] text-center text-gray-400">Shipping and taxes calculated at checkout.</p>
              </div>
            )}
          </div>
        </div>
      </>
    );

    return createPortal(drawerContent, portalRoot);
  }
);

export default CartDrawer;
