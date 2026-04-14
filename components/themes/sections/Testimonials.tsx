import { cn } from "@/lib/utils";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface TestimonialsProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
}

export default function Testimonials({
  section,
  settings,
  className,
}: TestimonialsProps) {
  const items = (section.items || []) as Array<{
    quote?: string;
    author?: string;
    rating?: number;
    avatarUrl?: string;
  }>;

  if (items.length === 0) return null;

  return (
    <section
      className={cn("w-full py-16 md:py-24", className)}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6">
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
        {section.subtitle && (
          <p
            className="mx-auto mt-3 max-w-2xl text-center text-gray-500"
            style={{ fontFamily: settings.bodyFont }}
          >
            {section.subtitle}
          </p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <svg
                className="mb-4 h-8 w-8 shrink-0 opacity-20"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color: settings.accentColor }}
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              {item.quote && (
                <p
                  className="flex-1 text-gray-600"
                  style={{ fontFamily: settings.bodyFont }}
                >
                  &ldquo;{item.quote}&rdquo;
                </p>
              )}

              <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt={item.author || "Reviewer"}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    {(item.author || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  {item.author && (
                    <p
                      className="text-sm font-semibold text-gray-900"
                      style={{ fontFamily: settings.bodyFont }}
                    >
                      {item.author}
                    </p>
                  )}
                  {item.rating != null && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className="h-3.5 w-3.5"
                          fill={i < item.rating! ? "#FBBF24" : "#E5E7EB"}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
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
