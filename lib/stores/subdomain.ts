import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reserved subdomains that must never be assigned to a store.
 * These correspond to platform services, infrastructure, or common conventions.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "dashboard",
  "api",
  "app",
  "support",
  "help",
  "mail",
  "email",
  "billing",
  "status",
  "docs",
  "blog",
  "store",
  "stores",
  "shop",
  "checkout",
  "cdn",
  "assets",
  "static",
  "media",
  "auth",
  "login",
  "register",
  "signup",
  "signin",
  "account",
  "test",
  "staging",
  "dev",
  "localhost",
  "pixeo",
  "pixeocommerce",
]);

const MAX_SUBDOMAIN_LENGTH = 48;
const MIN_SUBDOMAIN_LENGTH = 3;

/**
 * Sanitize a raw string into a valid subdomain slug.
 * - lowercase
 * - alphanumeric + hyphens only
 * - collapse repeated hyphens
 * - strip leading/trailing hyphens
 * - enforce length bounds
 */
export function sanitizeSubdomain(raw: string): string {
  let slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")   // strip non-alphanumeric except hyphens/spaces
    .replace(/[\s]+/g, "-")          // spaces -> hyphens
    .replace(/-+/g, "-")             // collapse repeated hyphens
    .replace(/^-+|-+$/g, "");        // strip leading/trailing hyphens

  if (slug.length > MAX_SUBDOMAIN_LENGTH) {
    slug = slug.slice(0, MAX_SUBDOMAIN_LENGTH).replace(/-+$/, "");
  }

  return slug;
}

/**
 * Check if a subdomain is reserved for platform use.
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

/**
 * Validate a subdomain candidate.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain) return "Subdomain is required";

  if (subdomain.length < MIN_SUBDOMAIN_LENGTH) {
    return `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters`;
  }
  if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
    return `Subdomain must be at most ${MAX_SUBDOMAIN_LENGTH} characters`;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return "Subdomain must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens";
  }
  if (isReservedSubdomain(subdomain)) {
    return `"${subdomain}" is reserved and cannot be used`;
  }

  return null;
}

/**
 * Check whether a subdomain is already taken in the database.
 */
export async function isSubdomainTaken(
  supabase: SupabaseClient,
  subdomain: string,
  excludeStoreId?: string
): Promise<boolean> {
  let query = supabase
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("subdomain", subdomain);

  if (excludeStoreId) {
    query = query.neq("id", excludeStoreId);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Generate a unique subdomain from a store name / brand name.
 *
 * Strategy:
 * 1. Sanitize the name into a slug
 * 2. If slug is valid and available, use it
 * 3. If taken or reserved, try appending -2, -3, ... up to -99
 * 4. If all fail, fall back to a random suffix
 */
export async function generateUniqueSubdomain(
  supabase: SupabaseClient,
  storeName: string,
  excludeStoreId?: string
): Promise<string> {
  const base = sanitizeSubdomain(storeName);

  if (!base || base.length < MIN_SUBDOMAIN_LENGTH) {
    // Name too short or entirely non-alphanumeric — use a random base
    const random = `store-${Date.now().toString(36)}`;
    return random;
  }

  // Try the base slug first
  if (!isReservedSubdomain(base)) {
    const taken = await isSubdomainTaken(supabase, base, excludeStoreId);
    if (!taken) return base;
  }

  // Try numbered suffixes
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`.slice(0, MAX_SUBDOMAIN_LENGTH);
    if (isReservedSubdomain(candidate)) continue;
    const taken = await isSubdomainTaken(supabase, candidate, excludeStoreId);
    if (!taken) return candidate;
  }

  // Fallback: random suffix
  const fallback = `${base.slice(0, 30)}-${Date.now().toString(36)}`;
  return fallback;
}
