"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { WelcomeAuthCard } from "@/components/auth/WelcomeAuthCard";

function PixeoLogo() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-12 w-12 flex items-center justify-center rounded-xl overflow-hidden">
        <Image 
          src="/pimain2.png" 
          alt="Pixeocommerce Logo" 
          width={48} 
          height={48} 
          className="object-contain"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Pixeocommerce
      </h1>
    </div>
  );
}

export default function LoginPage() {
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        
        if (profile?.is_admin) {
          setShowPicker(true);
        } else {
          router.push("/dashboard");
        }
      }
    }
    checkSession();
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      {/* Header Logo Area */}
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <PixeoLogo />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[480px] bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700 delay-100">
        {!showPicker ? (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back
              </h2>
              <p className="mt-3 text-slate-500 font-medium leading-relaxed">
                Your ultimate merchant command center for scaling your commerce empire.
              </p>
            </div>

            <WelcomeAuthCard />

            <div className="pt-8 text-center border-t border-slate-50 mt-8">
              <p className="text-sm text-slate-500 font-medium">
                New to Pixeocommerce?{" "}
                <Link 
                  href="https://www.pixeocommerce.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 font-bold hover:underline"
                >
                  Get started →
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-8 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Where to next?</h2>
              <p className="mt-3 text-slate-500 font-medium leading-relaxed">Select the dashboard you want to access</p>
            </div>
            
            <div className="grid gap-4">
              <Button
                onClick={() => router.push("/admin")}
                className="h-24 bg-slate-900 text-white hover:bg-slate-800 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-lg font-bold">Admin Dashboard</span>
                </div>
                <span className="text-xs font-medium opacity-70">Manage the platform & stores</span>
              </Button>
              
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="h-24 border-slate-200 text-slate-900 hover:bg-slate-50 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-lg font-bold">Merchant Dashboard</span>
                </div>
                <span className="text-xs font-medium text-slate-500">Manage your own products & orders</span>
              </Button>
            </div>
            
            <div className="pt-4 text-center">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setShowPicker(false);
                }}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                Switch account or go back
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 text-slate-400 text-sm font-medium">
        © 2026 Pixeocommerce. Built for scale.
      </footer>
    </div>
  );
}
