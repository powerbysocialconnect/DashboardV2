import { cn, formatCurrency } from "@/lib/utils";
import type { HomepageSection, Product, ThemeSettings } from "@/types/database";

interface FeaturedProductsProps {
  section: HomepageSection;
  settings: ThemeSettings;
  products: Product[];
  className?: string;
}

export default function FeaturedProducts({
  section,
  settings,
  products,
  className,
}: FeaturedProductsProps) {
  const limit = section.limit || 8;
  const categoryId = section.category_id;
  
  const displayed = products
    .filter((p) => p.active)
    .filter((p) => !categoryId || p.category_id === categoryId)
    .slice(0, limit);

  if (displayed.length === 0) return null;

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

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {displayed.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              settings={settings}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  settings,
}: {
  product: Product;
  settings: ThemeSettings;
}) {
  const thumbnail = product.image_urls?.[0];
  const hasCompare =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {hasCompare && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: settings.accentColor }}
          >
            Sale
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3
          className="line-clamp-2 text-sm font-medium text-gray-900"
          style={{ fontFamily: settings.bodyFont }}
        >
          {product.name}
        </h3>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <span
            className="text-base font-bold"
            style={{ color: settings.accentColor }}
          >
            {formatCurrency(product.price)}
          </span>
          {hasCompare && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.compare_at_price!)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
