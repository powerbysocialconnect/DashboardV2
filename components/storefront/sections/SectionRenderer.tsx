"use client";

import React, { useState } from "react";
import type { PageSection } from "@/types/database";
import { ChevronDown } from "lucide-react";

/**
 * Renders the storefront view of a page section.
 * Each section type is rendered with a premium, editorial design
 * matching the Core theme aesthetic.
 */
export function SectionRenderer({ section }: { section: PageSection }) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} />;
    case "text":
      return <TextSection section={section} />;
    case "image_text":
      return <ImageTextSection section={section} />;
    case "faq_accordion":
      return <FAQSection section={section} />;
    case "contact_form":
      return <ContactSection section={section} />;
    case "cta_banner":
      return <CTABannerSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "spacer":
      return <SpacerSection section={section} />;
    default:
      return null;
  }
}

/**
 * Renders all sections in a page's content_json array.
 */
export function PageSectionsRenderer({
  sections,
}: {
  sections: PageSection[];
}) {
  return (
    <div className="page-sections">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}

/* ========== Individual Section Components ========== */

function HeroSection({ section }: { section: PageSection }) {
  const hasBackground = section.background_image_url;

  return (
    <section
      className="relative flex min-h-[50vh] items-center justify-center overflow-hidden"
      style={
        hasBackground
          ? {
              backgroundImage: `url(${section.background_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "#f8f8f8" }
      }
    >
      {hasBackground && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        {section.heading && (
          <h1
            className="text-4xl font-black uppercase tracking-tight md:text-6xl lg:text-7xl"
            style={
              hasBackground
                ? { color: "white" }
                : {
                    WebkitTextStroke: "1.5px black",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }
            }
          >
            {section.heading}
          </h1>
        )}
        {section.subheading && (
          <p
            className={`mt-6 text-base md:text-lg leading-relaxed ${
              hasBackground ? "text-white/80" : "text-gray-500"
            }`}
          >
            {section.subheading}
          </p>
        )}
        {section.button_text && section.button_url && (
          <a
            href={section.button_url}
            className="mt-8 inline-block border-2 border-current px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-black hover:text-white"
            style={
              hasBackground ? { color: "white", borderColor: "white" } : {}
            }
          >
            {section.button_text}
          </a>
        )}
      </div>
    </section>
  );
}

function TextSection({ section }: { section: PageSection }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="prose prose-lg prose-gray mx-auto">
        {section.content?.split("\n").map((paragraph, i) => (
          <p
            key={i}
            className="text-[15px] leading-[1.8] text-gray-600 mb-4 last:mb-0"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function ImageTextSection({ section }: { section: PageSection }) {
  const isLeftImage = section.image_position !== "right";

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 md:py-24">
      <div
        className={`grid items-center gap-12 md:grid-cols-2 lg:gap-20 ${
          !isLeftImage ? "md:[direction:rtl]" : ""
        }`}
      >
        {/* Image */}
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 md:[direction:ltr]">
          {section.image_url ? (
            <img
              src={section.image_url}
              alt={section.image_alt || ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300">
              <span className="text-sm uppercase tracking-widest">
                Image
              </span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="md:[direction:ltr]">
          {section.heading && (
            <h2 className="text-2xl font-black uppercase tracking-tight md:text-3xl">
              {section.heading}
            </h2>
          )}
          {section.content && (
            <div className="mt-6">
              {section.content.split("\n").map((p, i) => (
                <p
                  key={i}
                  className="text-[15px] leading-[1.8] text-gray-600 mb-4 last:mb-0"
                >
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ section }: { section: PageSection }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {section.heading && (
        <h2 className="mb-12 text-center text-2xl font-black uppercase tracking-tight md:text-3xl">
          {section.heading}
        </h2>
      )}
      <div className="space-y-0 divide-y divide-gray-100">
        {(section.items || []).map((item, index) => (
          <FAQItem key={index} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left group"
      >
        <span className="text-[14px] font-bold uppercase tracking-tight text-gray-900 pr-8 group-hover:text-gray-600 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "mt-4 max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-[14px] leading-[1.8] text-gray-500">{answer}</p>
      </div>
    </div>
  );
}

function ContactSection({ section }: { section: PageSection }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-16 md:grid-cols-2">
        {/* Contact Info */}
        <div>
          {section.form_heading && (
            <h2 className="text-2xl font-black uppercase tracking-tight md:text-3xl">
              {section.form_heading}
            </h2>
          )}
          <div className="mt-8 space-y-6">
            {section.email && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                  Email
                </p>
                <a
                  href={`mailto:${section.email}`}
                  className="text-[14px] font-medium text-gray-900 hover:text-gray-600 transition-colors"
                >
                  {section.email}
                </a>
              </div>
            )}
            {section.phone && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                  Phone
                </p>
                <a
                  href={`tel:${section.phone}`}
                  className="text-[14px] font-medium text-gray-900 hover:text-gray-600 transition-colors"
                >
                  {section.phone}
                </a>
              </div>
            )}
            {section.address && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                  Address
                </p>
                <p className="text-[14px] leading-relaxed text-gray-600">
                  {section.address}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Contact form submitted! (Integration pending)");
            }}
          >
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">
                Name
              </label>
              <input
                type="text"
                required
                className="w-full border-b border-gray-200 bg-transparent py-3 text-[14px] focus:border-black focus:outline-none transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full border-b border-gray-200 bg-transparent py-3 text-[14px] focus:border-black focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">
                Message
              </label>
              <textarea
                required
                rows={4}
                className="w-full border-b border-gray-200 bg-transparent py-3 text-[14px] focus:border-black focus:outline-none transition-colors resize-none"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function CTABannerSection({ section }: { section: PageSection }) {
  const bgColor = section.cta_background_color || "#000000";
  const isLight =
    parseInt(bgColor.replace("#", ""), 16) > 0xffffff / 2;

  return (
    <section
      className="px-6 py-20 md:py-28 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-2xl">
        {section.cta_heading && (
          <h2
            className={`text-2xl font-black uppercase tracking-tight md:text-4xl ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            {section.cta_heading}
          </h2>
        )}
        {section.cta_description && (
          <p
            className={`mt-4 text-[14px] leading-relaxed ${
              isLight ? "text-gray-600" : "text-white/70"
            }`}
          >
            {section.cta_description}
          </p>
        )}
        {section.cta_button_text && section.cta_button_url && (
          <a
            href={section.cta_button_url}
            className={`mt-8 inline-block border-2 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${
              isLight
                ? "border-black text-black hover:bg-black hover:text-white"
                : "border-white text-white hover:bg-white hover:text-black"
            }`}
          >
            {section.cta_button_text}
          </a>
        )}
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: PageSection }) {
  return (
    <section className="bg-gray-50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        {section.heading && (
          <h2 className="mb-16 text-center text-2xl font-black uppercase tracking-tight md:text-3xl">
            {section.heading}
          </h2>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {(section.testimonials || []).map((t, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-[14px] italic leading-[1.8] text-gray-600">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[12px] font-bold text-gray-500">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[12px] font-bold text-gray-900">
                    {t.name}
                  </p>
                  {t.role && (
                    <p className="text-[11px] text-gray-400">{t.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpacerSection({ section }: { section: PageSection }) {
  return <div style={{ height: `${section.height || 64}px` }} />;
}
