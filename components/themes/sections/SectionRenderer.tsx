"use client";

import React from 'react';
import { Hero } from './Hero';
import { FeaturedProducts } from './FeaturedProducts';
import CategoryGrid from './CategoryGrid';

export function ThemeSectionRenderer({ 
  section, 
  products, 
  categories = [],
  currency, 
  subdomain 
}: any) {
  const isEnabled = section.enabled !== false;
  
  if (!isEnabled) return null;

  switch (section.type) {
    case 'hero':
      return <Hero settings={section} subdomain={subdomain} />;
    
    case 'featured_products':
      return (
        <FeaturedProducts 
          settings={section} 
          products={products} 
          currency={currency} 
          subdomain={subdomain} 
        />
      );
    
    case 'category_grid':
      return (
        <CategoryGrid 
          section={section} 
          categories={categories}
          settings={{
            primaryColor: section.primaryColor || '#000000',
            accentColor: section.accentColor || '#666666',
            backgroundColor: section.backgroundColor || '#FFFFFF',
            headingFont: 'Inter',
            bodyFont: 'Inter',
            buttonStyle: 'rounded',
            logoAlignment: 'left'
          }} 
        />
      );
    
    case 'brand_statement':
      return (
        <section className="bg-white py-24 md:py-32 border-b border-black/[0.05]">
          <div className="max-w-4xl mx-auto px-6 text-center">
             <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-tight mb-8">
               {section.heading}
             </h2>
             <p className="text-[16px] md:text-[18px] text-gray-500 leading-relaxed font-normal">
               {section.body}
             </p>
          </div>
        </section>
      );

    case 'newsletter':
      return (
        <section 
          className="py-24 md:py-32"
          style={{ 
            backgroundColor: section.backgroundColor || '#1A1A1A',
            color: section.textColor || '#FFFFFF'
          }}
        >
          <div className="max-w-2xl mx-auto px-6 text-center">
             <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6">
                {section.heading || "STAY IN TOUCH"}
             </h2>
             <p className="text-white/60 mb-10 text-[14px] uppercase font-bold tracking-widest">
                {section.subheading}
             </p>
             <form className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="email" 
                  placeholder="YOUR@EMAIL.COM" 
                  className="flex-1 h-14 bg-white/5 border border-white/20 px-6 text-[12px] font-bold uppercase tracking-widest focus:outline-none focus:border-white transition-colors"
                />
                <button 
                  className="h-14 px-10 bg-white text-black text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
                >
                  {section.buttonLabel || "SUBSCRIBE"}
                </button>
             </form>
          </div>
        </section>
      );

    default:
      console.warn(`Unknown section type: ${section.type}`);
      return null;
  }
}
