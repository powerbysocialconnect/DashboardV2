"use client";

import React from 'react';
import { cn } from "@/lib/utils";

export function Hero({ settings = {}, subdomain = "" }: any) {
  const heading = settings.overlayHeading;
  const subheading = settings.overlaySubheading;
  const ctaLabel = settings.ctaLabel;
  const ctaLink = settings.ctaLink;
  const desktopImage = settings.desktopImage;
  const mobileImage = settings.mobileImage || desktopImage;
  const position = settings.overlayPosition || "center";

  const getFullCtaLink = () => {
    if (!ctaLink) return "#";
    if (ctaLink.startsWith('http')) return ctaLink;
    return subdomain ? `/store/${subdomain}${ctaLink}` : ctaLink;
  };

  return (
    <section className="relative w-full h-[80vh] min-h-[600px] overflow-hidden bg-black flex items-center">
      {/* Background Images */}
      <div className="absolute inset-0 z-0">
        {desktopImage ? (
          <>
             <img 
               src={desktopImage} 
               alt="" 
               className={cn(
                 "w-full h-full object-cover hidden md:block transition-transform duration-[10s] hover:scale-105",
                 !mobileImage && "block"
               )} 
             />
             {mobileImage && (
               <img 
                 src={mobileImage} 
                 alt="" 
                 className="w-full h-full object-cover md:hidden" 
               />
             )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className={cn(
        "relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 flex",
        position === 'left' ? 'justify-start text-left' : 
        position === 'right' ? 'justify-end text-right' : 
        'justify-center text-center'
      )}>
        <div className="max-w-3xl">
          {heading && (
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-8">
              {heading}
            </h1>
          )}
          {subheading && (
            <p className="text-lg md:text-xl text-white/90 font-medium tracking-tight mb-10 max-w-xl mx-auto md:mx-0">
              {subheading}
            </p>
          )}
          {ctaLabel && (
            <a 
              href={getFullCtaLink()}
              className="inline-block px-10 py-4 bg-white text-black text-[12px] font-bold uppercase tracking-[0.2em] transition-transform active:scale-95 hover:bg-black hover:text-white border border-white"
            >
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
