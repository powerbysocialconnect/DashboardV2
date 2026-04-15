"use client";

import React from 'react';
import { STOREFRONT_LOGO_HEADER_CLASSES } from '@/components/themes/core/storefrontLogo';
import { Search, ShoppingBag, Menu } from 'lucide-react';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';
import { useUI } from '../../../packages/pixeo-theme-sdk/src/hooks/useUI';
import { useCart } from '../../../packages/pixeo-theme-sdk/src/hooks/useCart';

interface HeaderSettings {
  logoText: string;
  logoUrl?: string;
  sticky: boolean;
}

const HeaderSection = defineSection<HeaderSettings>(
  {
    name: 'Header',
    settings: [
      { id: 'logoText', type: 'text', label: 'Logo Text', default: 'PIXEO' },
      { id: 'sticky', type: 'checkbox', label: 'Sticky Header', default: true },
    ],
  },
  (({ settings }) => {
    const { toggleSearch, toggleCart } = useUI();
    const { itemCount } = useCart();

    return (
      <header className={`${settings?.sticky ?? true ? 'sticky top-0 z-50' : ''} w-full bg-white`}>
        <div className="w-full px-6 h-20 flex items-center justify-between">
          
          {/* Left: Mobile Menu (Hidden on desktop, kept for structural balance) */}
          <div className="flex-1">
            <button className="lg:hidden p-2 -ml-2 text-gray-900 hover:opacity-70 transition-opacity">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Logo (Premium Serif or Image) */}
          <div className="flex-1 flex justify-center items-center">
            <a href="/" className="flex items-center justify-center">
              {settings?.logoUrl ? (
                 <img src={settings.logoUrl} alt={settings?.logoText || 'Store Logo'} className={STOREFRONT_LOGO_HEADER_CLASSES} />
              ) : (
                <span className="text-xl md:text-2xl font-light tracking-[0.2em] md:tracking-[0.3em] text-black uppercase" style={{ WebkitTextStroke: '0.5px black', color: 'transparent' }}>
                  {settings?.logoText || 'CORE'}
                </span>
              )}
            </a>
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex justify-end items-center space-x-6">
            <button 
              onClick={toggleSearch}
              className="group flex flex-col items-center hover:opacity-70 transition-opacity"
            >
              <Search className="w-5 h-5 text-gray-900 stroke-[1.5]" />
            </button>
            <button 
              onClick={toggleCart}
              className="group relative flex flex-col items-center hover:opacity-70 transition-opacity"
            >
              <ShoppingBag className="w-5 h-5 text-gray-900 stroke-[1.5]" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center rounded-full tabular-nums">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    );
  })
);

export default HeaderSection;
