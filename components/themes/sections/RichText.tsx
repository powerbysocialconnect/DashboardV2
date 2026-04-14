import { cn } from "@/lib/utils";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface RichTextProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
}

export default function RichText({
  section,
  settings,
  className,
}: RichTextProps) {
  if (!section.title && !section.body) return null;

  return (
    <section
      className={cn("w-full py-16 md:py-24", className)}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div className="mx-auto max-w-3xl px-6">
        {section.title && (
          <h2
            className="text-center text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              fontFamily: settings.headingFont,
              color: settings.primaryColor,
            }}
          >
            {section.title}
          </h2>
        )}
        {section.body && (
          <div
            className="mt-6 whitespace-pre-line text-base leading-relaxed text-gray-600 md:text-lg"
            style={{ fontFamily: settings.bodyFont }}
          >
            {section.body}
          </div>
        )}
      </div>
    </section>
  );
}
