"use client";

import React, { useState, useEffect } from 'react';
import { 
  Menu, Search, ShoppingBag, X, Plus, Minus, 
  Instagram, Facebook, Youtube, Twitter, Music, ExternalLink,
  Ticket
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import {
  STOREFRONT_LOGO_FOOTER_CLASSES,
  STOREFRONT_LOGO_HEADER_CLASSES,
} from "@/components/themes/core/storefrontLogo";
import { formatPrice } from "@/lib/currency";
import { UIProvider, useUI } from '@/packages/pixeo-theme-sdk/src/hooks/useUI';
import { useCart, CartProvider } from '@/packages/pixeo-theme-sdk/src/hooks/useCart';

/**
 * PREMIUM CART DRAWER
 */
export function CartDrawer({ 
  currency, 
  subdomain = "",
  storeId
}: { 
  currency: string; 
  subdomain?: string;
  storeId: string;
}) {
  const { isCartOpen, closeCart } = useUI();
  const { 
    items, 
    subtotal, 
    discount, 
    total, 
    updateQuantity, 
    removeItem, 
    applyDiscount, 
    removeDiscount 
  } = useCart();
  
  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsApplying(true);
    setCouponError(null);
    
    const result = await applyDiscount(couponInput, storeId);
    if (!result.success) {
      setCouponError(result.message);
    } else {
      setCouponInput('');
    }
    setIsApplying(false);
  };

  useEffect(() => {
    if (isCartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] transition-opacity duration-500",
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />
      
      {/* Drawer */}
      <aside 
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[480px] bg-white z-[70] shadow-2xl transition-transform duration-500 ease-out",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full bg-white font-sans">
          <div className="flex items-center justify-between px-6 md:px-8 h-20 border-b border-black/[0.05]">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-black">Shopping Cart</h2>
            <button onClick={closeCart} className="p-2 -mr-2 hover:opacity-40 transition-opacity">
              <X className="w-5 h-5 text-black stroke-[1.25]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 md:px-8">
            {items.length > 0 ? (
              <div className="py-8 space-y-8">
                {items.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-24 aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <Link href={subdomain ? `/store/${subdomain}/product/${item.id}` : `/product/${item.id}`} onClick={closeCart} className="block group">
                             <h4 className="text-[12px] font-bold text-black uppercase tracking-tight pr-4 group-hover:text-gray-500 transition-colors">
                               {item.name}
                             </h4>
                          </Link>
                          <span className="text-[12px] font-bold text-black tabular-nums">{formatPrice(item.price * item.quantity, currency)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">One Size / Default</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-black/[0.1] rounded-md px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:opacity-50"><Minus className="w-3" /></button>
                          <span className="mx-3 text-[11px] font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:opacity-50"><Plus className="w-3" /></button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-[11px] font-medium text-gray-400 hover:text-black transition-colors">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Coupon */}
                <div className="pt-8 border-t border-black/[0.05]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-black mb-3 text-left">Discount code</p>
                  
                  {discount ? (
                    <div className="flex items-center justify-between bg-black/[0.02] border border-black/[0.05] p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                          <Ticket className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider">{discount.code}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">
                            {discount.type === 'percentage' ? `${discount.value}% OFF` : `${formatPrice(discount.value, currency)} OFF`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={removeDiscount}
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="ENTER CODE" 
                          className={cn(
                            "flex-1 h-11 border px-4 text-[11px] uppercase tracking-wider focus:outline-none transition-colors",
                            couponError ? "border-red-500" : "border-black/[0.1] focus:border-black"
                          )}
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        />
                        <button 
                          onClick={handleApplyCoupon}
                          disabled={isApplying || !couponInput.trim()}
                          className="px-6 h-11 bg-white border border-black text-[11px] font-bold uppercase transition-colors hover:bg-black hover:text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplying ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{couponError}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="w-6 h-6 text-gray-300 stroke-[1.25]" />
                </div>
                <h3 className="text-[14px] font-bold uppercase tracking-[0.2em] text-black mb-2">Your cart is empty</h3>
                <p className="text-[12px] text-gray-500 max-w-[240px] leading-relaxed mb-8">Items added to your cart will appear here.</p>
                <button onClick={closeCart} className="px-8 h-12 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black/90 transition-opacity">Continue Shopping</button>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="p-6 md:p-8 bg-white border-t border-black/[0.05] space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="uppercase font-bold tracking-[0.15em] text-gray-400">Subtotal</span>
                  <span className="font-bold text-gray-400 tabular-nums line-through decoration-black/[0.1] decoration-2">
                    {subtotal !== total && formatPrice(subtotal, currency)}
                  </span>
                  {subtotal === total && <span className="font-bold text-black tabular-nums">{formatPrice(subtotal, currency)}</span>}
                </div>
                {discount && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="uppercase font-bold tracking-[0.15em] text-green-600">Discount ({discount.code})</span>
                    <span className="font-bold text-green-600 tabular-nums">
                      -{formatPrice(subtotal - total, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-black/[0.03]">
                  <span className="uppercase font-bold tracking-[0.15em] text-black">Total</span>
                  <span className="font-bold text-black tabular-nums text-lg">{formatPrice(total, currency)}</span>
                </div>
              </div>
              <button 
                className="w-full h-14 bg-black text-white text-[12px] font-bold uppercase tracking-[0.2em] transition-transform active:scale-[0.98] hover:bg-black/90"
                onClick={() => window.location.href = subdomain ? `/store/${subdomain}/checkout` : '/checkout'}
              >
                Go to Checkout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/**
 * PREMIUM SEARCH OVERLAY
 */
export function SearchOverlay({ 
  products = [], 
  currency,
  subdomain = ""
}: { 
  products: any[]; 
  currency: string;
  subdomain?: string;
}) {
  const { isSearchOpen, closeSearch } = useUI();
  const [query, setQuery] = useState('');

  // Prevent body scroll when search is open
  useEffect(() => {
    if (isSearchOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSearchOpen]);

  const filteredProducts = query.length > 1 
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] transition-all duration-500 ease-in-out",
        isSearchOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/98 backdrop-blur-xl" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* Header Trigger */}
        <div className="flex items-center justify-between px-6 md:px-12 h-16 md:h-20">
          <span className="text-[10px] md:text-[11px] uppercase font-bold tracking-[0.25em] text-black">Search Products</span>
          <button onClick={closeSearch} className="p-2 -mr-2 hover:opacity-40 transition-opacity">
            <X className="w-5 h-5 text-black stroke-[1.25]" />
          </button>
        </div>

        {/* Input Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-20">
           <div className="max-w-4xl mx-auto w-full pt-[5%] md:pt-[8%]">
              <div className="w-full relative group">
                <input 
                  autoFocus={isSearchOpen}
                  type="text" 
                  placeholder="TYPE TO SEARCH..." 
                  className="w-full bg-transparent border-none text-3xl md:text-8xl font-black tracking-tighter uppercase placeholder:text-black/20 focus:outline-none focus:ring-0 py-8 pr-12"
                  style={{ 
                    WebkitTextStroke: '1px black',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent'
                  }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                
                {/* Custom Blinking Typing Line - Only show when query is empty */}
                <span 
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-12 md:h-24 w-[2px] md:w-[4px] bg-black pointer-events-none",
                    query ? "hidden" : "inline-block animate-blink"
                  )}
                  style={{ 
                    left: '0',
                    marginLeft: '2px'
                  }}
                />

                <div className="h-[2px] w-full bg-black/[0.1] relative">
                   <div 
                     className="absolute inset-y-0 left-0 bg-black transition-transform duration-700 ease-out"
                     style={{ transform: `scaleX(${query ? 1 : 0})`, transformOrigin: 'left' }}
                   />
                </div>
              </div>

             {/* Results Preview */}
             <div className="w-full mt-16 md:mt-24">
               {query.length > 1 && filteredProducts.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                   {filteredProducts.map((product) => (
                     <Link 
                       key={product.id} 
                       href={subdomain ? `/store/${subdomain}/product/${product.id}` : `/product/${product.id}`}
                       onClick={closeSearch}
                       className="flex items-center gap-6 p-4 rounded-[20px] hover:bg-black/[0.02] transition-all group"
                     >
                       <div className="w-16 md:w-20 aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shrink-0 shadow-sm">
                         <img 
                           src={product.image_urls?.[0] || 'https://via.placeholder.com/200x300'} 
                           alt={product.name} 
                           className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                         />
                       </div>
                       <div className="flex flex-col">
                         <h4 className="text-[14px] md:text-[16px] font-bold text-black uppercase tracking-tight leading-tight">{product.name}</h4>
                         <p className="text-[12px] text-gray-400 mt-2 font-bold tabular-nums">
                            {formatPrice(product.price, currency)}
                         </p>
                       </div>
                     </Link>
                   ))}
                 </div>
               ) : query.length > 1 ? (
                 <p className="text-left py-20 text-[14px] font-medium text-black/40 italic">
                   No products found for &ldquo;{query}&rdquo;
                 </p>
               ) : (
                  <div className="pt-8">
                    <span className="text-[10px] md:text-[11px] uppercase font-bold tracking-[0.25em] text-black block mb-8">Suggestions</span>
                    <div className="flex flex-wrap gap-3">
                      {['Latest Collections', 'Accessories', 'New Drops', 'Essentials'].map((tag) => (
                        <button 
                          key={tag} 
                          onClick={() => setQuery(tag)}
                          className="px-6 py-3 rounded-full border border-black/[0.1] text-[11px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-300"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PREMIUM NAVIGATION SIDEBAR
 */
export interface NavPage {
  title: string;
  slug: string;
}

export function NavSidebar({ 
  storeName, 
  headerPages = [], 
  subdomain = "",
  socialLinks = {}
}: { 
  storeName: string; 
  headerPages?: NavPage[];
  subdomain?: string;
  socialLinks?: Record<string, string>;
}) {
  const { isSidebarOpen, closeSidebar, toggleSearch } = useUI();

  useEffect(() => {
    if (isSidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  // Helper to build store-scoped links
  // If subdomain is present, we are in a subdirectory view (localhost)
  const getStoreLink = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return subdomain ? `/store/${subdomain}${cleanPath}` : cleanPath;
  };

  const navLinks = [
    { name: 'Home', href: getStoreLink('/') },
    { name: 'Shop All', href: getStoreLink('/collections/all') },
    ...headerPages.map(p => ({ name: p.title, href: getStoreLink(`/${p.slug}`) })),
  ];

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[80] transition-opacity duration-500",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
      />
      <aside 
        className={cn(
          "fixed top-0 left-0 h-full w-full md:w-[400px] bg-white z-[90] shadow-2xl transition-transform duration-500 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-8 md:p-12">
          <div className="flex justify-between items-center mb-16">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-gray-400">Menu</span>
            <button onClick={closeSidebar} className="p-2 -mr-2 hover:opacity-40 transition-opacity">
              <X className="w-5 h-5 text-black stroke-[1.25]" />
            </button>
          </div>

          <nav className="flex-1 space-y-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={closeSidebar}
                className="block text-2xl md:text-3xl font-bold tracking-tight uppercase hover:translate-x-2 transition-transform duration-300"
              >
                {link.name}
              </Link>
            ))}
            <button 
              onClick={() => { closeSidebar(); toggleSearch(); }}
              className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-gray-300 hover:text-black transition-colors text-left"
            >
              Search
            </button>
          </nav>

          <div className="pt-12 border-t border-black/[0.05] space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Social</span>
              <div className="flex gap-6 items-center">
                 {Object.entries(socialLinks || {}).map(([platform, url]) => {
                   if (!url) return null;
                   
                   let IconContent: React.ReactNode = null;
                   if (platform === 'instagram') IconContent = <Instagram className="w-5 h-5" />;
                   if (platform === 'facebook') IconContent = <Facebook className="w-5 h-5" />;
                   if (platform === 'youtube') IconContent = <Youtube className="w-5 h-5" />;
                   if (platform === 'tiktok') IconContent = <Music className="w-5 h-5" />;
                   if (platform === 'twitter' || platform === 'x') {
                     IconContent = (
                       <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                         <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.486h2.039L6.482 3.239h-2.19l13.315 17.4z" />
                       </svg>
                     );
                   }

                   return (
                     <a 
                       key={platform} 
                       href={url as string} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="text-black hover:opacity-50 transition-opacity"
                     >
                       {IconContent}
                     </a>
                   );
                 })}
              </div>
            </div>
            <div className="pt-4">
               <p className="text-[10px] text-gray-300 leading-relaxed uppercase tracking-widest">
                 &copy; {new Date().getFullYear()} {storeName}
               </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/**
 * PREMIUM HEADER
 */
export function CoreHeader({ 
  storeName, 
  logoUrl,
  subdomain = ""
}: { 
  storeName: string; 
  logoUrl?: string | null;
  subdomain?: string;
}) {
  const { toggleSidebar, toggleSearch, toggleCart } = useUI();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-black/[0.05] font-sans">
      <div className="max-w-[1600px] mx-auto h-16 md:h-20 grid grid-cols-3 items-center px-4 md:px-8 lg:px-12">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="p-2 -ml-2 hover:opacity-40 transition-opacity">
            <Menu className="w-5 h-5 text-gray-900 stroke-[1.25]" />
          </button>
        </div>
        <div className="flex min-w-0 justify-center items-center px-1 sm:px-2">
          <Link href={subdomain ? `/store/${subdomain}` : '/'} className="flex max-w-full items-center justify-center transition-transform active:scale-95">
            {logoUrl ? <img src={logoUrl} alt={storeName} className={STOREFRONT_LOGO_HEADER_CLASSES} /> 
            : <span 
                className="text-lg md:text-2xl font-black tracking-[0.3em] uppercase whitespace-nowrap"
                style={{
                  WebkitTextStroke: '1px black',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}
              >
                {storeName}
              </span>}
          </Link>
        </div>
        <div className="flex justify-end items-center space-x-2 md:space-x-6">
          <button onClick={toggleSearch} className="p-2 hover:opacity-40 transition-opacity">
            <Search className="w-5 h-5 text-gray-900 stroke-[1.25]" />
          </button>
          <button onClick={toggleCart} className="p-2 relative hover:opacity-40 transition-opacity">
            <ShoppingBag className="w-5 h-5 text-gray-900 stroke-[1.25]" />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-black text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * CORE THEME LAYOUT WRAPPER
 */
export function CoreLayout({ 
  children, 
  store, 
  currency, 
  products = [], 
  headerPages = [], 
  footerPages = [] 
}: { 
  children: React.ReactNode, 
  store: any, 
  currency: string, 
  products?: any[], 
  headerPages?: NavPage[], 
  footerPages?: NavPage[] 
}) {
  const storeSubdomain = store.subdomain || "";
  
  const getStoreLink = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return storeSubdomain ? `/store/${storeSubdomain}${cleanPath}` : cleanPath;
  };

  return (
    <CartProvider subdomain={storeSubdomain}>
      <UIProvider>
        <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
          <CoreHeader storeName={store.name} logoUrl={store.logo_url} subdomain={storeSubdomain} />
          <CartDrawer currency={currency} subdomain={storeSubdomain} storeId={store.id} />
          <SearchOverlay products={products} currency={currency} subdomain={storeSubdomain} />
          <NavSidebar 
            storeName={store.name} 
            headerPages={headerPages} 
            subdomain={storeSubdomain} 
            socialLinks={store.social_links || {}}
          />
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-24 border-t border-black/[0.05] bg-white">
            <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
              
              {/* Center Logo */}
              <div className="mb-10">
                <a href={getStoreLink('/')} className="block group">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className={STOREFRONT_LOGO_FOOTER_CLASSES} />
                  ) : (
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white font-black text-xl group-hover:scale-105 transition-transform">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </a>
              </div>

              {/* Headline & Description */}
              {(store.footer_headline || store.footer_description) && (
                <div className="mb-12 space-y-4 max-w-2xl">
                  {store.footer_headline && (
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-black">
                      {store.footer_headline}
                    </h2>
                  )}
                  {store.footer_description && (
                    <p className="text-[14px] leading-relaxed text-gray-400 font-normal">
                      {store.footer_description}
                    </p>
                  )}
                </div>
              )}

              {/* Social Icons Bar */}
              {store.social_links && Object.values(store.social_links).some(v => !!v) && (
                <div className="flex items-center justify-center gap-8 mb-16">
                  {store.social_links.facebook && (
                    <a href={store.social_links.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-40 transition-opacity">
                      <Facebook className="w-6 h-6 text-black stroke-[1.5]" />
                    </a>
                  )}
                  {store.social_links.instagram && (
                    <a href={store.social_links.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-40 transition-opacity">
                      <Instagram className="w-6 h-6 text-black stroke-[1.5]" />
                    </a>
                  )}
                  {store.social_links.youtube && (
                    <a href={store.social_links.youtube} target="_blank" rel="noopener noreferrer" className="hover:opacity-40 transition-opacity">
                      <Youtube className="w-6 h-6 text-black stroke-[1.5]" />
                    </a>
                  )}
                  {store.social_links.tiktok && (
                    <a href={store.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="hover:opacity-40 transition-opacity">
                      <Music className="w-6 h-6 text-black stroke-[1.5]" />
                    </a>
                  )}
                  {store.social_links.x && (
                    <a href={store.social_links.x} target="_blank" rel="noopener noreferrer" className="hover:opacity-40 transition-opacity">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.486h2.039L6.482 3.239h-2.19l13.315 17.4z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {/* Footer Links */}
              {footerPages.length > 0 && (
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
                  {footerPages.map((page) => (
                    <a
                      key={page.slug}
                      href={getStoreLink(`/${page.slug}`)}
                      className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 hover:text-black transition-colors"
                    >
                      {page.title}
                    </a>
                  ))}
                </div>
              )}

              <div className="pt-8 border-t border-black/[0.03] w-full">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-medium leading-none">
                  &copy; {new Date().getFullYear()} {store.name} &mdash; PIXEO CORE
                </p>
              </div>
            </div>
          </footer>
        </div>
      </UIProvider>
    </CartProvider>
  );
}
