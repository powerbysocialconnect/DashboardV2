import React from 'react';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';

interface HeroSettings {
  heading: string;
  subheading: string;
  alignment: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom: number;
}

const HeroSection = defineSection<HeroSettings>(
  {
    name: 'Hero',
    settings: [
      { id: 'heading', type: 'text', label: 'Heading', default: 'Designing the Future of Commerce.' },
      { id: 'subheading', type: 'textarea', label: 'Subheading', default: 'A minimalist platform for high-end boutique stores and independent creators.' },
      { id: 'alignment', type: 'select', label: 'Alignment', default: 'left', options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' }
      ]},
      { id: 'paddingTop', type: 'number', label: 'Padding Top', default: 120 },
      { id: 'paddingBottom', type: 'number', label: 'Padding Bottom', default: 80 }
    ],
  },
  ({ settings }) => {
    const alignmentClasses = {
      left: 'text-left',
      center: 'text-center mx-auto',
      right: 'text-right ml-auto'
    };

    return (
      <section 
        className="w-full bg-white px-6" 
        style={{ 
          paddingTop: `${settings?.paddingTop ?? 120}px`, 
          paddingBottom: `${settings?.paddingBottom ?? 80}px` 
        }}
      >
        <div className={`max-w-4xl ${alignmentClasses[(settings?.alignment as 'left' | 'center' | 'right') || 'left']}`}>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tighter leading-[1.1] mb-8 uppercase italic">
            {settings?.heading || 'Designing the Future of Commerce.'}
          </h1>
          <p className="text-lg lg:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed">
            {settings?.subheading || 'A minimalist platform for high-end boutique stores and independent creators.'}
          </p>
        </div>
      </section>
    );
  }
);

export default HeroSection;
