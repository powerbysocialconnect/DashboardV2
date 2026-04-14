import React from 'react';
import { Mail, Github, Instagram, Twitter } from 'lucide-react';
import { defineSection } from '../../../packages/pixeo-theme-sdk/src/core';

const FooterSection = defineSection(
  {
    name: 'Footer',
    settings: [
      { id: 'brandStatement', type: 'textarea', label: 'Brand Statement', default: 'Crafting minimalist digital experiences for the next generation of commerce.' },
    ],
  },
  ({ settings }) => {
    return (
      <footer className="bg-white border-t border-gray-100 px-6 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
            
            {/* Left: Brand & Socials */}
            <div className="lg:col-span-5 space-y-12">
              <div className="space-y-6">
                 <h3 className="text-xl font-bold uppercase tracking-tighter">PIXEOCORE</h3>
                 <p className="text-gray-400 text-sm max-w-sm leading-relaxed uppercase font-bold tracking-tight">
                    {settings.brandStatement}
                 </p>
              </div>
              <div className="flex gap-6">
                <a href="#" className="hover:opacity-50 transition-opacity"><Instagram className="w-5 h-5" /></a>
                <a href="#" className="hover:opacity-50 transition-opacity">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.486h2.039L6.482 3.239h-2.19l13.315 17.4z" />
                  </svg>
                </a>
                <a href="#" className="hover:opacity-50 transition-opacity"><Github className="w-5 h-5" /></a>
                <a href="#" className="hover:opacity-50 transition-opacity"><Mail className="w-5 h-5" /></a>
              </div>
            </div>

            {/* Right: Link Columns */}
            <div className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-10">
               <div className="space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">Explore</h4>
                  <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Shop All</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Catalog</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Archives</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Journal</a></li>
                  </ul>
               </div>
               <div className="space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">Support</h4>
                  <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Shipping</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Returns</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">FAQ</a></li>
                    <li><a href="#" className="hover:text-gray-400 transition-colors">Contact</a></li>
                  </ul>
               </div>
               <div className="col-span-2 lg:col-span-1 space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">Newsletter</h4>
                  <p className="text-[10px] uppercase font-bold text-gray-400 leading-relaxed">Join our mailing list for updates and minimalist inspiration.</p>
                  <div className="relative border-b border-black py-2">
                     <input type="email" placeholder="Your Email" className="bg-transparent text-xs outline-none w-full uppercase font-bold" />
                     <button className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-[0.2em] uppercase">Join</button>
                  </div>
               </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="mt-20 lg:mt-40 pt-10 border-t border-gray-50 flex flex-col lg:flex-row justify-between items-center gap-6">
             <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
             </div>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">© 2026 PIXEOCOMMERCE. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    );
  }
);

export default FooterSection;
