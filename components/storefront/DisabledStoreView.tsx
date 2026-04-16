import React from 'react';
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DisabledStoreViewProps {
  storeName?: string;
}

export default function DisabledStoreView({ storeName }: DisabledStoreViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6 font-sans">
      <div className="max-w-2xl w-full">
        {/* Logo/Header */}
        <div className="flex justify-center mb-12">
          <img 
            src="/pimain2.png" 
            alt="Pixeo Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-black/[0.03]">
          <div className="p-8 md:p-16 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-8 border border-red-100">
              <ShieldAlert className="w-10 h-10 text-red-500" strokeWidth={1.5} />
            </div>

            {/* Content */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Storefront Temporarily Unavailable
            </h1>
            
            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-lg mx-auto">
              {storeName ? `"${storeName}"` : "This store"} is currently experiencing a technical interruption. 
              Services are temporarily suspended for review.
            </p>

            <div className="inline-block p-1 bg-gray-50 rounded-2xl border border-black/[0.05] mb-12">
              <div className="px-6 py-4 text-left">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Are you the owner of this store?
                </p>
                <p className="text-sm text-gray-500 leading-snug">
                  It appears there is an issue with your billing account. To reactivate your storefront and resume processing orders, please contact our support team immediately.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@pixeocommerce.com"
                className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-semibold rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] gap-2 shadow-lg shadow-black/10"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </a>
              <Link 
                href="/"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-2xl border border-black/10 hover:bg-gray-50 transition-all active:scale-[0.98] gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Pixeo
              </Link>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-6 border-t border-black/[0.03] text-center">
            <p className="text-[13px] text-gray-400 font-medium tracking-wide uppercase">
              Powered by PixeoCommerce
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
