"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

/**
 * PixeoCommerce V2 Cart System
 */

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant_id?: string;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  discount: any | null;
  total: number;
  itemCount: number;
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyDiscount: (code: string, storeId: string) => Promise<{ success: boolean; message: string }>;
  removeDiscount: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, subdomain }: { children: React.ReactNode, subdomain?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<any | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Persistence Keys
  const storageKey = subdomain ? `cart_${subdomain}` : 'cart_default';
  const discountKey = subdomain ? `discount_${subdomain}` : 'discount_default';

  // Load from persistence
  useEffect(() => {
    const savedCart = localStorage.getItem(storageKey);
    const savedDiscount = localStorage.getItem(discountKey);
    
    if (savedCart) {
      try { setItems(JSON.parse(savedCart)); } catch (e) { console.error("Failed to parse cart", e); }
    }
    if (savedDiscount) {
      try { setDiscount(JSON.parse(savedDiscount)); } catch (e) { console.error("Failed to parse discount", e); }
    }
    setIsHydrated(true);
  }, [storageKey, discountKey]);

  // Sync to persistence
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(storageKey, JSON.stringify(items));
      if (discount) {
        localStorage.setItem(discountKey, JSON.stringify(discount));
      } else {
        localStorage.removeItem(discountKey);
      }
    }
  }, [items, discount, isHydrated, storageKey, discountKey]);

  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  , [items]);

  const total = useMemo(() => {
    if (!discount) return subtotal;
    if (discount.type === 'percentage') {
      return subtotal * (1 - (discount.value / 100));
    } else {
      return Math.max(0, subtotal - discount.value);
    }
  }, [subtotal, discount]);

  const itemCount = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0)
  , [items]);

  const addItem = useCallback((item: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      const qtyToAdd = item.quantity || 1;
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i);
      }
      return [...prev, { ...item, quantity: qtyToAdd }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  }, [removeItem]);

  const applyDiscount = useCallback(async (code: string, storeId: string) => {
    try {
      const res = await fetch(`/api/store/${storeId}/validate-discount?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await res.json();

      if (data.valid && data.discount) {
        setDiscount(data.discount);
        return { success: true, message: 'Discount applied!' };
      } else {
        return { success: false, message: data.error || 'Invalid discount code' };
      }
    } catch (err) {
      return { success: false, message: 'Failed to validate discount' };
    }
  }, []);

  const removeDiscount = useCallback(() => {
    setDiscount(null);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(null);
  }, []);

  const value = useMemo(() => ({
    items,
    subtotal,
    discount,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyDiscount,
    removeDiscount
  }), [items, subtotal, discount, total, itemCount, addItem, removeItem, updateQuantity, clearCart, applyDiscount, removeDiscount]);

  return React.createElement(CartContext.Provider, { value }, children);
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
