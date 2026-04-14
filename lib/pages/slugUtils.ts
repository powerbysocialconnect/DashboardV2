/**
 * Slug utilities for store pages.
 * Handles generation, reserved-slug protection, and duplicate auto-naming.
 */

/** Reserved slugs that conflict with existing storefront routes */
export const RESERVED_SLUGS = new Set([
  "cart",
  "checkout",
  "product",
  "products",
  "collections",
  "account",
  "admin",
  "api",
  "login",
  "register",
  "search",
  "_next",
  "favicon",
  "store",
  "dashboard",
]);

/**
 * Generate a URL-safe slug from a title string.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a slug is reserved.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Generate a unique duplicate slug.
 * Given an existing slug like "about-us" and a list of all slugs for the store,
 * generates "about-us-copy", "about-us-copy-2", etc.
 */
export function generateDuplicateSlug(
  originalSlug: string,
  existingSlugs: string[]
): string {
  const slugSet = new Set(existingSlugs.map((s) => s.toLowerCase()));

  // Try "slug-copy" first
  const copySlug = `${originalSlug}-copy`;
  if (!slugSet.has(copySlug) && !isReservedSlug(copySlug)) {
    return copySlug;
  }

  // Try "slug-copy-2", "slug-copy-3", etc.
  let counter = 2;
  while (counter < 100) {
    const candidate = `${originalSlug}-copy-${counter}`;
    if (!slugSet.has(candidate) && !isReservedSlug(candidate)) {
      return candidate;
    }
    counter++;
  }

  // Fallback with timestamp
  return `${originalSlug}-copy-${Date.now()}`;
}

/**
 * Validate a slug for use. Returns null if valid, or an error message.
 */
export function validateSlug(slug: string): string | null {
  if (!slug || slug.length === 0) {
    return "Slug is required";
  }
  if (slug.length > 200) {
    return "Slug must be 200 characters or less";
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return "Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen";
  }
  if (isReservedSlug(slug)) {
    return `"${slug}" is a reserved route and cannot be used as a page slug`;
  }
  return null;
}
