import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";
import Image from "next/image";
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { code?: string; error?: string };
}) {
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`);
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin, full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    
    profile = data;
    isAdmin = !!data?.is_admin;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      {/* Header Logo Area */}
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <PixeoLogo />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[480px] bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700 delay-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {user ? "Welcome back" : "Log in to Pixeocommerce"}
          </h2>
          <p className="mt-3 text-slate-500 font-medium leading-relaxed">
            {user 
              ? `Logged in as ${profile?.email || user.email}`
              : "Your ultimate merchant command center for scaling your commerce empire."
            }
          </p>
        </div>

        {user ? (
          <div className="space-y-4">
            <Link href="/dashboard" className="block w-full">
              <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-base font-semibold transition-all group">
                Merchant Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {isAdmin && (
              <Link href="/admin" className="block w-full">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 hover:bg-slate-50 text-base font-semibold text-slate-700 transition-all">
                  Admin Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}

            <div className="pt-6 text-center">
              <form action="/auth/signout" method="post">
                <button className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors">
                  Not you? Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <WelcomeAuthCard />

            <div className="pt-4 text-center">
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
          </div>
        )}
      </div>

      <footer className="mt-12 text-slate-400 text-sm font-medium">
        © 2026 Pixeocommerce. Built for scale.
      </footer>
    </div>
  );
}
