import { cn } from "@/lib/utils";
import type { HomepageSection, ThemeSettings } from "@/types/database";

interface CategoryGridProps {
  section: HomepageSection;
  settings: ThemeSettings;
  className?: string;
}

export default function CategoryGrid({
  section,
  settings,
  className,
  categories = [],
}: CategoryGridProps & { categories?: any[] }) {
  const items = (section.items || []) as Array<{
    name?: string;
    imageUrl?: string;
    url?: string;
    categoryId?: string;
  }>;

  if (items.length === 0) return null;

  // Enhance items with real category data if available
  const enhancedItems = items.map(item => {
    if (item.categoryId) {
      const category = categories.find(c => c.id === item.categoryId);
      if (category) {
        return {
          ...item,
          name: item.name || category.name,
          imageUrl: item.imageUrl || category.image_url,
          url: item.url || `/collections/${category.slug}`
        };
      }
    }
    return item;
  });

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

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {enhancedItems.map((item, index) => (
            <a
              key={index}
              href={item.url || "#"}
              className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name || "Category"}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="relative z-10 w-full p-5">
                <h3
                  className="text-lg font-semibold text-white md:text-xl"
                  style={{ fontFamily: settings.headingFont }}
                >
                  {item.name || "Category"}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
