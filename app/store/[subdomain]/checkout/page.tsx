"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/packages/pixeo-theme-sdk/src/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { ShoppingBag, X, Minus, Plus, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

/**
 * CHECKOUT CONTENT COMPONENT
 * Handles 2 Steps: 'shipping' and 'payment'
 */
function CheckoutContent({ store, subdomain, shippingMethods }: { store: any, subdomain: string, shippingMethods: any[] }) {
  const router = useRouter();
  const { items, subtotal, total, updateQuantity, removeItem, discount, applyDiscount, removeDiscount, clearCart } = useCart();
  
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zip: "",
    country: "GB"
  });

  const [selectedShippingId, setSelectedShippingId] = useState<string>(shippingMethods[0]?.id || "");
  const selectedShipping = shippingMethods.find(m => m.id === selectedShippingId);
  const shippingCost = selectedShipping?.rate || 0;
  
  const finalTotal = (total || subtotal) + shippingCost;

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !store) return;
    setIsApplyingCode(true);
    const result = await applyDiscount(promoCode, store.id);
    setIsApplyingCode(false);
    if (result.success) {
      toast.success(result.message);
      setPromoCode("");
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
          cancel_url: `${window.location.origin}/store/${subdomain}/checkout`,
          customer_details: form,
          shipping_rate_id: selectedShippingId
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

  if (items.length === 0) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-8">
           <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">&mdash; your bag</h1>
           <p className="text-gray-400 text-lg">Your bag is currently empty.</p>
           <Link href={`/store/${subdomain}`} className="inline-block border-b-2 border-black pb-1 font-bold text-sm tracking-widest uppercase text-black">
             Continue shopping &mdash;
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-20 pb-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_350px] gap-12 lg:gap-24">
          
          {/* Sidebar Navigation */}
          <div className="hidden lg:block space-y-4 pt-2">
            <div className="flex flex-col gap-6">
              <div className={`flex items-center gap-3 transition-opacity duration-300 ${step !== 'shipping' ? 'opacity-20' : 'opacity-100'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="text-[13px] font-bold tracking-[0.2em] uppercase">01. Shipping</span>
              </div>
              <div className={`flex items-center gap-3 transition-opacity duration-300 ${step !== 'payment' ? 'opacity-20' : 'opacity-100'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                <span className="text-[13px] font-bold tracking-[0.2em] uppercase">02. Payment</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-16">
            
            {/* STEP 1: SHIPPING FORM */}
            {step === 'shipping' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">&mdash; Shipping</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">First Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.firstName}
                      onChange={(e) => setForm({...form, firstName: e.target.value})}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.lastName}
                      onChange={(e) => setForm({...form, lastName: e.target.value})}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="col-span-full space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.email}
                      onChange={(e) => setForm({...form, email: e.target.value})}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="col-span-full space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Delivery Address</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.address}
                      onChange={(e) => setForm({...form, address: e.target.value})}
                      placeholder="Street name and number"
                    />
                  </div>
                  <div className="space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">City</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.city}
                      onChange={(e) => setForm({...form, city: e.target.value})}
                      placeholder="London"
                    />
                  </div>
                  <div className="space-y-1 border-b border-black/10 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Zip / Postal Code</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent outline-none font-bold text-[15px] placeholder:text-gray-200"
                      value={form.zip}
                      onChange={(e) => setForm({...form, zip: e.target.value})}
                      placeholder="SW1A 1AA"
                    />
                  </div>
                  <div className="space-y-2 border-b border-black/10 pb-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Country</label>
                    <div 
                      className="w-full h-6 flex items-center justify-between cursor-pointer group"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    >
                      <span className="font-bold text-[15px]">
                        {(() => {
                          const countries: any = {
                            "GB": "United Kingdom",
                            "US": "United States",
                            "CA": "Canada",
                            "AU": "Australia",
                            "FR": "France",
                            "DE": "Germany",
                            "IT": "Italy",
                            "ES": "Spain",
                            "NL": "Netherlands",
                            "BE": "Belgium",
                            "SE": "Sweden",
                            "NO": "Norway",
                            "DK": "Denmark",
                            "FI": "Finland",
                            "IE": "Ireland",
                            "AT": "Austria",
                            "CH": "Switzerland",
                            "PT": "Portugal",
                            "GR": "Greece",
                            "PL": "Poland",
                            "CZ": "Czech Republic",
                            "HU": "Hungary",
                            "NZ": "New Zealand",
                            "JP": "Japan",
                            "CN": "China",
                            "KR": "South Korea",
                            "SG": "Singapore",
                            "AE": "United Arab Emirates",
                            "SA": "Saudi Arabia",
                            "BR": "Brazil",
                            "MX": "Mexico",
                            "ZA": "South Africa"
                          };
                          return countries[form.country] || "Select Country";
                        })()}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-black transition-transform duration-300 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 w-full z-50 bg-white border border-black/10 shadow-xl mt-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[250px] overflow-y-auto py-2">
                          {[
                            { code: "GB", name: "United Kingdom" },
                            { code: "US", name: "United States" },
                            { code: "CA", name: "Canada" },
                            { code: "AU", name: "Australia" },
                            { code: "FR", name: "France" },
                            { code: "DE", name: "Germany" },
                            { code: "IT", name: "Italy" },
                            { code: "ES", name: "Spain" },
                            { code: "NL", name: "Netherlands" },
                            { code: "BE", name: "Belgium" },
                            { code: "SE", name: "Sweden" },
                            { code: "NO", name: "Norway" },
                            { code: "DK", name: "Denmark" },
                            { code: "FI", name: "Finland" },
                            { code: "IE", name: "Ireland" },
                            { code: "AT", name: "Austria" },
                            { code: "CH", name: "Switzerland" },
                            { code: "PT", name: "Portugal" },
                            { code: "GR", name: "Greece" },
                            { code: "PL", name: "Poland" },
                            { code: "CZ", name: "Czech Republic" },
                            { code: "HU", name: "Hungary" },
                            { code: "NZ", name: "New Zealand" },
                            { code: "JP", name: "Japan" },
                            { code: "CN", name: "China" },
                            { code: "KR", name: "South Korea" },
                            { code: "SG", name: "Singapore" },
                            { code: "AE", name: "United Arab Emirates" },
                            { code: "SA", name: "Saudi Arabia" },
                            { code: "BR", name: "Brazil" },
                            { code: "MX", name: "Mexico" },
                            { code: "ZA", name: "South Africa" }
                          ].map((c) => (
                            <div 
                              key={c.code}
                              className="px-4 py-3 text-[13px] font-bold uppercase tracking-tight hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setForm({...form, country: c.code});
                                setShowCountryDropdown(false);
                              }}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8 pt-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">02. Delivery Method</h3>
                  <div className="space-y-4">
                    {shippingMethods.map((method) => (
                      <button 
                        key={method.id}
                        onClick={() => setSelectedShippingId(method.id)}
                        className={`w-full flex items-center justify-between p-6 border transition-all duration-300 ${selectedShippingId === method.id ? 'border-black bg-gray-50' : 'border-black/10 hover:border-black/30'}`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedShippingId === method.id ? 'border-black' : 'border-black/20'}`}>
                            {selectedShippingId === method.id && <div className="w-2 h-2 rounded-full bg-black"></div>}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold uppercase tracking-tight">{method.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">{method.description || 'Standard delivery'}</p>
                          </div>
                        </div>
                        <span className="text-[14px] font-black tabular-nums">{method.rate === 0 ? 'FREE' : formatPrice(method.rate, store.currency || 'GBP')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (!form.firstName || !form.email || !form.address) {
                      toast.error("Please fill in the required fields");
                      return;
                    }
                    if (!selectedShippingId) {
                      toast.error("Please select a delivery method");
                      return;
                    }
                    setStep('payment');
                    window.scrollTo(0, 0);
                  }}
                  className="w-full md:w-auto px-12 py-5 bg-black text-white text-[11px] font-black uppercase tracking-[0.25em] hover:bg-black/90 transition-all active:scale-[0.98]"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT / REVIEW */}
            {step === 'payment' && (
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                   <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">&mdash; Payment</h1>
                   <button onClick={() => setStep('shipping')} className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5">Edit shipping</button>
                </div>

                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-black/[0.05] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        <th className="pb-6 pr-4 w-12 font-medium">№</th>
                        <th className="pb-6 px-4 font-medium">Product</th>
                        <th className="pb-6 px-4 font-medium hidden md:table-cell">Colour</th>
                        <th className="pb-6 px-4 font-medium hidden md:table-cell">Size</th>
                        <th className="pb-6 px-4 font-medium text-center">Quantity</th>
                        <th className="pb-6 pl-4 text-right font-medium">Price</th>
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
                                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Ref: {item.product_id.split('-')[0].toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-10 px-4 hidden md:table-cell" style={{ verticalAlign: 'top' }}>
                             <span className="text-[14px] text-gray-500 font-medium uppercase">
                              {item.variant_name || "—"}
                            </span>
                          </td>
                          <td className="py-10 px-4 text-center" style={{ verticalAlign: 'top' }}>
                            <span className="text-black font-bold tabular-nums text-[14px]">{item.quantity}</span>
                          </td>
                          <td className="py-10 pl-4 text-right" style={{ verticalAlign: 'top' }}>
                            <span className="text-[15px] font-bold text-black tabular-nums">{formatPrice(item.price * item.quantity, store.currency || 'GBP')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-12">
                   {/* Promo logic */}
                   <div className="space-y-6">
                    {discount ? (
                        <div className="flex items-center gap-6 bg-gray-50 border border-black/[0.05] p-6 max-w-[400px]">
                          <div className="flex-1">
                            <p className="text-[12px] font-black uppercase tracking-widest mb-1">PROMO APPLIED: {discount.code}</p>
                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">
                              {discount.type === 'percentage' ? `${discount.value}% OFF` : `${formatPrice(discount.value, store.currency || 'GBP')} OFF`}
                            </p>
                          </div>
                          <button 
                            onClick={removeDiscount}
                            className="text-[11px] font-black uppercase tracking-widest border-b border-black pb-0.5 hover:opacity-100 opacity-60 transition-opacity"
                          >
                            REMOVE
                          </button>
                        </div>
                      ) : (
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
                                className="bg-transparent text-[12px] font-bold uppercase tracking-widest flex-1 outline-none font-sans"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                              />
                              <button 
                                className="text-[12px] font-black tracking-widest hover:opacity-100 opacity-60 transition-opacity p-2"
                                onClick={handleApplyPromo}
                                disabled={isApplyingCode || !promoCode.trim()}
                              >
                                {isApplyingCode ? '...' : 'APPLY'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Order Summary (Always Visible) */}
          <div className="w-full space-y-12">
            <div className="bg-gray-50/50 p-8 space-y-8 border border-black/[0.02]">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">Your Order</h2>
              
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-20 bg-white flex-shrink-0 overflow-hidden border border-black/[0.05]">
                       <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-tight line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Qty: {item.quantity}</p>
                      <p className="text-[12px] font-bold tabular-nums">{formatPrice(item.price * item.quantity, store.currency || 'GBP')}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-8 border-t border-black/10">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Subtotal</span>
                  <span className="text-black font-bold tabular-nums">{formatPrice(subtotal, store.currency || 'GBP')}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Shipping</span>
                  <span className="text-black font-bold tabular-nums">
                    {selectedShippingId ? (shippingCost === 0 ? 'FREE' : formatPrice(shippingCost, store.currency || 'GBP')) : '—'}
                  </span>
                </div>
                {discount && (
                  <div className="flex justify-between items-center text-[13px] text-green-600">
                    <span className="font-medium uppercase tracking-widest text-[10px]">Discount</span>
                    <span className="font-bold tabular-nums">
                      -{discount.type === 'percentage' ? `${discount.value}%` : formatPrice(discount.value, store.currency || 'GBP')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-black flex justify-between items-baseline">
                <span className="text-[16px] font-black uppercase tracking-tighter text-black">Total</span>
                <div className="text-right">
                  <span className="text-3xl font-black tabular-nums tracking-tighter text-black">
                    {formatPrice(finalTotal, store.currency || 'GBP')}
                  </span>
                  <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Inc. VAT</p>
                </div>
              </div>

              {step === 'payment' && (
                <div className="pt-4">
                  <button 
                    onClick={handleProcessOrder}
                    disabled={isCheckoutLoading || items.length === 0}
                    className="w-full bg-black text-white py-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-black/90 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isCheckoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Pay with Card
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-8 border-l-2 border-black/5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Secure Checkout</p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">All transactions are processed securely via Stripe. Your data is protected under industry standards.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
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
      <CheckoutContent store={store} subdomain={subdomain} shippingMethods={shippingMethods} />
    </CoreLayout>
  );
}
