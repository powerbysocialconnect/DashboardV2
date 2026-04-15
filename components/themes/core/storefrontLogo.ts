import { cn } from "@/lib/utils";

/**
 * Default storefront logo sizing for every merchant on CoreLayout / ThemeRenderer.
 * Wordmarks and script marks need enough height; max-width caps very wide assets.
 */
export const STOREFRONT_LOGO_HEADER_CLASSES = cn(
  "block w-auto object-contain object-center",
  /* Slightly larger than before so wordmarks read like the footer; still fits h-16 / md:h-20 header row */
  "min-h-[3.5rem] h-14 max-h-16 sm:h-16 sm:max-h-[4.25rem] md:h-[4.25rem] md:max-h-[4.5rem]",
  "max-w-[min(360px,60vw)]"
);

export const STOREFRONT_LOGO_FOOTER_CLASSES = cn(
  "block w-auto object-contain object-center mx-auto",
  "min-h-[4rem] h-16 max-h-24 md:h-20 md:max-h-28",
  "max-w-[min(400px,92vw)]",
  "grayscale group-hover:grayscale-0 transition-all"
);
