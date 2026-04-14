"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search as SearchIcon, ArrowRight } from 'lucide-react';
import { useSearch } from '../../../packages/pixeo-theme-sdk/src/hooks/useSearch';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';
import { useUI } from '../../../packages/pixeo-theme-sdk/src/hooks/useUI';

const SearchOverlay = defineSection(
  {
    name: 'Search Overlay',
    settings: [
      { id: 'placeholder', type: 'text', label: 'Input Placeholder', default: 'Searching for something specific?' },
    ],
  },
  ({ settings }) => {
    const { query, results, loading, onQueryChange } = useSearch();
    const { isSearchOpen, closeSearch } = useUI();
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Lock scroll and handle escape key
    useEffect(() => {
      if (!mounted) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeSearch();
      };

      if (isSearchOpen) {
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
    }, [isSearchOpen, mounted, closeSearch]);

    if (!mounted) return null;

    // Use a portal to ensure the overlay is outside the main layout flow
    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!portalRoot) return null;

    const overlayContent = (
      <>
        <div className={`fixed inset-0 z-[600] bg-white transition-opacity duration-500 ease-in-out ${isSearchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="max-w-7xl mx-auto px-6 h-full flex flex-col">
            
            {/* Search Header */}
            <div className="h-24 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Search</span>
              <button 
                onClick={closeSearch}
                className="p-2 hover:opacity-50 transition-opacity"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-20 lg:py-32">
              <div className="relative border-b-2 border-black">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={settings?.placeholder || 'Searching for something specific?'}
                  className="w-full bg-transparent text-3xl lg:text-5xl font-bold tracking-tight py-4 outline-none placeholder:text-gray-200"
                  autoFocus={isSearchOpen}
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                   {loading ? (
                     <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin rounded-full" />
                   ) : (
                     <SearchIcon className="w-8 h-8 lg:w-10 lg:h-10" />
                   )}
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto pb-20">
              {results.length > 0 ? (
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                   {results.map((product: any) => (
                     <a key={product.id} href={`/product/${product.id}`} className="group block">
                        <div className="aspect-square bg-gray-100 overflow-hidden mb-4">
                           <img src={product.image_urls?.[0] || product.images?.[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        </div>
                        <h4 className="font-bold uppercase text-xs mb-1">{product.name}</h4>
                        <p className="text-xs text-gray-500">${product.price}</p>
                     </a>
                   ))}
                 </div>
              ) : query && !loading ? (
                <div className="text-center py-20">
                   <p className="text-gray-400">No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Popular Categories</h3>
                    <ul className="space-y-4">
                      {['New Arrivals', 'Best Sellers', 'Minimalist Series', 'Accessories'].map(cat => (
                        <li key={cat}>
                          <a href="#" className="text-2xl font-bold hover:pl-2 transition-all flex items-center gap-2 group">
                            {cat} <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );

    return createPortal(overlayContent, portalRoot);
  }
);

export default SearchOverlay;
