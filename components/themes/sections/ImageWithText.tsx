import { cn } from "@/lib/utils";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface ImageWithTextProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
}

const buttonRadius: Record<ThemeSettings["buttonStyle"], string> = {
  rounded: "rounded-lg",
  square: "rounded-none",
  pill: "rounded-full",
};

export default function ImageWithText({
  section,
  settings,
  className,
}: ImageWithTextProps) {
  const reversed = section.variant === "reversed";
  const btnClass = buttonRadius[settings.buttonStyle];

  return (
    <section
      className={cn("w-full py-16 md:py-24", className)}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div
        className={cn(
          "mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2 lg:gap-20",
          reversed && "md:[&>:first-child]:order-2"
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          {section.imageUrl ? (
            <img
              src={section.imageUrl}
              alt={section.title || "Section image"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${settings.primaryColor}22, ${settings.accentColor}22)`,
              }}
            />
          )}
        </div>

        <div>
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
          {section.body && (
            <p
              className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg"
              style={{ fontFamily: settings.bodyFont }}
            >
              {section.body}
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
      </div>
    </section>
  );
}
