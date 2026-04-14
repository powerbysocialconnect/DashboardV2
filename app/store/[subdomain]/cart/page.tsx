"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/packages/pixeo-theme-sdk/src/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { ShoppingBag, X, Minus, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * CART CONTENT COMPONENT
 * This component uses useCart and is wrapped by CartProvider inside CoreLayout
 */
function CartContent({ store, subdomain, shippingMethods }: { store: any, subdomain: string, shippingMethods: any[] }) {
  const router = useRouter();
  const { items, subtotal, total, updateQuantity, removeItem, discount, applyDiscount } = useCart();
  
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);

  const cheapestShipping = shippingMethods[0]?.rate || 0;
  const finalTotal = total + cheapestShipping;

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !store) return;
    setIsApplyingCode(true);
    const result = await applyDiscount(promoCode, store.id);
    setIsApplyingCode(false);
    if (result.success) {
      toast.success(result.message);
      setShowPromoInput(false);
    } else {
      toast.error(result.message);
    }
  };

  const handleProcessOrder = async () => {
    if (items.length === 0 || !store) return;
    setIsCheckoutLoading(true);

    try {
      const response = await fetch(`/api/headless/stores/${store.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product_id,
            variantId: item.variant_id,
            quantity: item.quantity
          })),
          discount_code: discount?.code || null,
          success_url: `${window.location.origin}/store/${subdomain}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/store/${subdomain}/cart`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to initiate checkout");
        setIsCheckoutLoading(false);
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pt-20 pb-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_350px] gap-12 lg:gap-24">
          
          {/* Sidebar Navigation */}
          <div className="hidden lg:block space-y-4 pt-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="text-[13px] font-bold tracking-widest uppercase">Cart</span>
              </div>
              <div className="flex items-center gap-3 opacity-20">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="text-[13px] font-bold tracking-widest uppercase">Shipping</span>
              </div>
              <div className="flex items-center gap-3 opacity-20">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="text-[13px] font-bold tracking-widest uppercase">Payment</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              &mdash; your bag
            </h1>

            {items.length === 0 ? (
              <div className="py-20">
                <p className="text-gray-400 text-lg mb-8">Your bag is currently empty.</p>
                <Link href={`/store/${subdomain}`} className="inline-block border-b-2 border-black pb-1 font-bold text-sm tracking-widest uppercase">
                  Continue shopping &mdash;
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/[0.05] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                      <th className="pb-6 pr-4 w-12 font-medium">№</th>
                      <th className="pb-6 px-4 font-medium">Product</th>
                      <th className="pb-6 px-4 font-medium hidden md:table-cell">Colour</th>
                      <th className="pb-6 px-4 font-medium hidden md:table-cell">Size</th>
                      <th className="pb-6 px-4 font-medium text-center">Quantity</th>
                      <th className="pb-6 pl-4 text-right font-medium">Price</th>
                      <th className="pb-6 pl-4 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="group">
                        <td className="py-10 pr-4 text-[14px] font-bold tabular-nums text-black" style={{ verticalAlign: 'top' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-10 px-4">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-24 h-32 flex-shrink-0 bg-gray-50 overflow-hidden">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                  <ShoppingBag className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Link href={`/store/${subdomain}/product/${item.product_id}`} className="text-[15px] font-bold text-black hover:opacity-60 transition-opacity uppercase tracking-tight">
                                {item.name}
                              </Link>
                              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">
                                Ref: {item.product_id.split('-')[0].toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-10 px-4 hidden md:table-cell" style={{ verticalAlign: 'top' }}>
                          <span className="text-[14px] text-gray-500 font-medium capitalize">
                            {(item as any).variant_selections?.Colour || (item as any).variant_selections?.Color || "—"}
                          </span>
                        </td>
                        <td className="py-10 px-4 hidden md:table-cell" style={{ verticalAlign: 'top' }}>
                           <span className="text-[14px] text-gray-500 font-medium uppercase">
                            {(item as any).variant_selections?.Size || "—"}
                          </span>
                        </td>
                        <td className="py-10 px-4" style={{ verticalAlign: 'top' }}>
                          <div className="flex items-center justify-center gap-4 text-gray-400 font-medium">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="hover:text-black transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-black font-bold tabular-nums">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="hover:text-black transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-10 pl-4 text-right" style={{ verticalAlign: 'top' }}>
                          <span className="text-[15px] font-bold text-black tabular-nums">
                            {formatPrice(item.price * item.quantity, store.currency || 'GBP')}
                          </span>
                        </td>
                        <td className="py-10 pl-4 text-right" style={{ verticalAlign: 'top' }}>
                          <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-black transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-12 flex flex-col md:flex-row justify-between items-start gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="promo-toggle" 
                        className="w-4 h-4 accent-black cursor-pointer"
                        checked={showPromoInput}
                        onChange={(e) => setShowPromoInput(e.target.checked)}
                      />
                      <label htmlFor="promo-toggle" className="text-[13px] font-bold text-black cursor-pointer select-none">I have a promocode</label>
                    </div>
                    
                    {showPromoInput && (
                      <div className="flex items-center border-b border-black pb-1 max-w-[250px]">
                        <input 
                          type="text" 
                          placeholder="ENTER CODE" 
                          className="bg-transparent text-[12px] font-bold uppercase tracking-widest flex-1 outline-none"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        />
                        <button 
                          className="text-[12px] font-black tracking-widest hover:opacity-100 opacity-60 transition-opacity p-2"
                          onClick={handleApplyPromo}
                          disabled={isApplyingCode}
                        >
                          {isApplyingCode ? '...' : 'APPLY'}
                        </button>
                      </div>
                    )}

                    <div className="pt-8">
                      <Link href={`/store/${subdomain}`} className="inline-block border-b border-black pb-1 font-bold text-[12px] tracking-widest uppercase">
                        Continue shopping &mdash;
                      </Link>
                    </div>
                  </div>

                  <div className="w-full md:w-[350px] space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[14px]">
                        <span className="text-gray-400 font-medium">Subtotal</span>
                        <span className="text-black font-bold tabular-nums">{formatPrice(subtotal, store.currency || 'GBP')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[14px]">
                        <span className="text-gray-400 font-medium">Estimated delivery costs</span>
                        <span className="text-black font-bold tabular-nums">
                          {cheapestShipping > 0 ? formatPrice(cheapestShipping, store.currency || 'GBP') : "FREE"}
                        </span>
                      </div>
                      {discount && (
                        <div className="flex justify-between items-center text-[14px] text-green-600">
                           <span className="font-medium">Discount ({discount.code})</span>
                           <span className="font-bold tabular-nums">
                             -{discount.type === 'percentage' ? `${discount.value}%` : formatPrice(discount.value, store.currency || 'GBP')}
                           </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-6 border-t border-black/[0.05] flex justify-between items-baseline">
                      <span className="text-[18px] font-bold uppercase tracking-tighter">Total</span>
                      <div className="text-right">
                        <span className="text-4xl font-bold tabular-nums tracking-tighter">
                          {formatPrice(finalTotal, store.currency || 'GBP')}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Including VAT</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleProcessOrder}
                      disabled={isCheckoutLoading}
                      className="w-full bg-black text-white py-5 text-[12px] font-black uppercase tracking-[0.2em] transition-all hover:bg-black/90 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      {isCheckoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isCheckoutLoading ? 'Directing to secure payment...' : 'Process order'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden xl:block"></div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;
  const supabase = createClient();
  
  const [store, setStore] = useState<any>(null);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("subdomain", subdomain)
        .single();

      if (storeData) {
        setStore(storeData);
        const { data: shippingData } = await supabase
          .from("shipping_methods")
          .select("*")
          .eq("store_id", storeData.id)
          .eq("active", true)
          .order("rate", { ascending: true });

        if (shippingData) {
          setShippingMethods(shippingData);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [subdomain, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (!store) return <div>Store not found</div>;

  return (
    <CoreLayout store={store} currency={store.currency || 'GBP'} products={[]}>
      <CartContent store={store} subdomain={subdomain} shippingMethods={shippingMethods} />
    </CoreLayout>
  );
}
