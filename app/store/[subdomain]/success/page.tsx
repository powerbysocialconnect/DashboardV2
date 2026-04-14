"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/packages/pixeo-theme-sdk/src/hooks/useCart";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { CheckCircle2, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * SUCCESS CONTENT COMPONENT
 * This sits INSIDE CoreLayout so it can access the CartProvider context
 */
function SuccessContent({ store, subdomain, sessionId }: { store: any, subdomain: string, sessionId: string | null }) {
  const router = useRouter();
  const { clearCart } = useCart();
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    // Clear the cart on successful checkout
    // This now works because we are inside the CartProvider provided by CoreLayout
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/store/${subdomain}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [subdomain, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20 bg-white font-sans">
      <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Status Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-black/5 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-black stroke-[1.25]" />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black">
            &mdash; Thank You
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">
            Your order has been received and is being processed. 
            A confirmation email will be sent to you shortly.
          </p>
        </div>

        {/* Order Reference */}
        {sessionId && (
          <div className="pt-8 border-t border-black/[0.05]">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 mb-2 font-black">Order Reference</p>
            <code className="text-[13px] font-bold text-black bg-gray-50 px-3 py-1.5 rounded uppercase tracking-tighter">
              {sessionId.slice(-12)}
            </code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-8 flex flex-col items-center justify-center gap-6">
          <Link 
            href={`/store/${subdomain}`}
            className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-black border-b-2 border-black pb-1 hover:gap-5 transition-all"
          >
            Continue Shopping <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">
            Redirecting to homepage in {countdown}s
          </p>
        </div>

        {/* Secondary Links */}
        <div className="pt-20">
            <div className="flex justify-center items-center gap-4 text-gray-300">
              <ShoppingBag className="w-4 h-4" />
              <span className="w-px h-4 bg-gray-200" />
              <p className="text-[10px] uppercase font-bold tracking-[0.25em]">PixeoCommerce Checkout</p>
            </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  const params = useParams<{ subdomain: string }>();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const supabase = createClient();

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Clear the cart immediately on mount (using subdomain to target the correct cart)
  useEffect(() => {
    const storageKey = params.subdomain ? `cart_${params.subdomain}` : 'cart_default';
    const discountKey = params.subdomain ? `discount_${params.subdomain}` : 'discount_default';
    
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(discountKey);
      console.log(`[success] Cart cleared for ${params.subdomain}`);
    } catch (e) {
      console.error("Failed to clear cart directly", e);
    }
  }, [params.subdomain]);

  useEffect(() => {
    async function fetchStore() {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("subdomain", params.subdomain)
        .single();
      if (data) setStore(data);
      setLoading(false);
    }
    fetchStore();
  }, [params.subdomain, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (!store) return <div>Store not found</div>;

  return (
    <CoreLayout store={store} currency={store.currency || 'GBP'} products={[]}>
      <SuccessContent store={store} subdomain={params.subdomain} sessionId={sessionId} />
    </CoreLayout>
  );
}
