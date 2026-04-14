"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Mail, Lock, ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function GoogleIconSvg() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function WelcomeAuthCard() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setLoading(true);
    setError("");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setError("");
    setStep("password");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Refresh page to allow Server Components to detect the new session
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {step === "email" ? (
        <form onSubmit={handleContinue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-slate-900 transition-all"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-base font-semibold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
            disabled={loading}
          >
            Continue with Email
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </Label>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Change Email
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-slate-900 transition-all"
                autoFocus
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-base font-semibold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      )}

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center text-xs uppercase font-bold tracking-[0.2em] text-slate-300">
          <span className="bg-white px-4">Or</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthLogin("google")}
          disabled={loading}
          className="h-14 rounded-2xl border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all gap-3 group"
        >
          <GoogleIconSvg />
          <span className="font-semibold text-slate-700 group-hover:text-white transition-colors">Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthLogin("github")}
          disabled={loading}
          className="h-14 rounded-2xl border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all gap-3 group"
        >
          <Github className="h-5 w-5 text-slate-900 group-hover:text-white transition-colors" />
          <span className="font-semibold text-slate-700 group-hover:text-white transition-colors">GitHub</span>
        </Button>
      </div>
    </div>
  );
}
