import { cn } from "@/lib/utils";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface HeroSectionProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

const buttonRadius: Record<ThemeSettings["buttonStyle"], string> = {
  rounded: "rounded-lg",
  square: "rounded-none",
  pill: "rounded-full",
};

export default function HeroSection({
  section,
  settings,
  className,
  titleClassName,
  subtitleClassName,
}: HeroSectionProps) {
  const variant = section.variant || "centered";
  const btnClass = buttonRadius[settings.buttonStyle];

  if (variant === "minimal") {
    return (
      <section
        className={cn("w-full py-20 md:py-32", className)}
        style={{ backgroundColor: settings.backgroundColor }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          {section.title && (
            <h1
              className={cn(
                "text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl",
                titleClassName
              )}
              style={{
                fontFamily: settings.headingFont,
                color: settings.primaryColor,
              }}
            >
              {section.title}
            </h1>
          )}
          {section.subtitle && (
            <p
              className={cn(
                "mt-4 text-lg text-gray-600 md:text-xl",
                subtitleClassName
              )}
              style={{ fontFamily: settings.bodyFont }}
            >
              {section.subtitle}
            </p>
          )}
          {section.ctaLabel && (
            <a
              href={section.ctaUrl || "#"}
              className={cn(
                "mt-8 inline-block px-8 py-3 text-sm font-semibold text-white transition-all hover:opacity-90",
                btnClass
              )}
              style={{ backgroundColor: settings.accentColor }}
            >
              {section.ctaLabel}
            </a>
          )}
        </div>
      </section>
    );
  }

  if (variant === "left-aligned") {
    return (
      <section
        className={cn(
          "w-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: settings.backgroundColor }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
          <div>
            {section.title && (
              <h1
                className={cn(
                  "text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl",
                  titleClassName
                )}
                style={{
                  fontFamily: settings.headingFont,
                  color: settings.primaryColor,
                }}
              >
                {section.title}
              </h1>
            )}
            {section.subtitle && (
              <p
                className={cn(
                  "mt-4 text-lg text-gray-600 md:text-xl",
                  subtitleClassName
                )}
                style={{ fontFamily: settings.bodyFont }}
              >
                {section.subtitle}
              </p>
            )}
            {section.ctaLabel && (
              <a
                href={section.ctaUrl || "#"}
                className={cn(
                  "mt-8 inline-block px-8 py-3 text-sm font-semibold text-white transition-all hover:opacity-90",
                  btnClass
                )}
                style={{ backgroundColor: settings.accentColor }}
              >
                {section.ctaLabel}
              </a>
            )}
          </div>
          {section.imageUrl && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <img
                src={section.imageUrl}
                alt={section.title || "Hero image"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  // Default: "centered" variant
  return (
    <section
      className={cn(
        "relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden md:min-h-[70vh]",
        className
      )}
    >
      {section.imageUrl && (
        <img
          src={section.imageUrl}
          alt={section.title || "Hero background"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: section.imageUrl
            ? `linear-gradient(to bottom, ${settings.primaryColor}CC, ${settings.primaryColor}99)`
            : settings.primaryColor,
        }}
      />
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {section.title && (
          <h1
            className={cn(
              "text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-7xl",
              titleClassName
            )}
            style={{ fontFamily: settings.headingFont }}
          >
            {section.title}
          </h1>
        )}
        {section.subtitle && (
          <p
            className={cn(
              "mt-4 text-lg text-white/80 md:text-xl lg:text-2xl",
              subtitleClassName
            )}
            style={{ fontFamily: settings.bodyFont }}
          >
            {section.subtitle}
          </p>
        )}
        {section.ctaLabel && (
          <a
            href={section.ctaUrl || "#"}
            className={cn(
              "mt-8 inline-block px-10 py-4 text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg",
              btnClass
            )}
            style={{
              backgroundColor: settings.accentColor,
              color: "#fff",
            }}
          >
            {section.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
