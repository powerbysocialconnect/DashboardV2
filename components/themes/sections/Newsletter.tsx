"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface NewsletterProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
}

const buttonRadius: Record<ThemeSettings["buttonStyle"], string> = {
  rounded: "rounded-lg",
  square: "rounded-none",
  pill: "rounded-full",
};

export default function Newsletter({
  section,
  settings,
  className,
}: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const btnClass = buttonRadius[settings.buttonStyle];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setTimeout(() => {
      toast.success("Thanks for subscribing!");
      setEmail("");
      setLoading(false);
    }, 600);
  }

  return (
    <section
      className={cn("w-full py-16 md:py-24", className)}
      style={{
        background: `linear-gradient(135deg, ${settings.primaryColor}0D, ${settings.accentColor}0D)`,
      }}
    >
      <div className="mx-auto max-w-2xl px-6 text-center">
        {section.title && (
          <h2
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              fontFamily: settings.headingFont,
              color: settings.primaryColor,
            }}
          >
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p
            className="mt-3 text-gray-500"
            style={{ fontFamily: settings.bodyFont }}
          >
            {section.subtitle}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={cn(
              "w-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 outline-none transition-shadow focus:ring-2 sm:max-w-xs",
              btnClass
            )}
            style={
              { "--tw-ring-color": settings.accentColor } as React.CSSProperties
            }
          />
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full px-8 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 sm:w-auto",
              btnClass
            )}
            style={{ backgroundColor: settings.accentColor }}
          >
            {loading ? "Subscribing..." : section.ctaLabel || "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}
