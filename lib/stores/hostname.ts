import { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/types/database";

/**
 * Platform domains that are NOT store subdomains.
 * Requests to these should be handled by the main app, not the storefront.
 */
const PLATFORM_HOSTS = new Set([
  "www",
  "admin",
  "dashboard",
  "api",
  "app",
]);

export type HostnameResolution =
  | { type: "platform"; app: "marketing" | "dashboard" | "admin" | "api" }
  | { type: "store"; subdomain: string; store: Store }
  | { type: "unknown"; hostname: string };

/**
 * Extract the subdomain from a full hostname.
 *
 * Handles:
 * - Production: `mystore.pixeocommerce.com`  ->  `mystore`
 * - Localhost:   `mystore.localhost:3000`     ->  `mystore`
 * - IP/direct:   `localhost:3000`             ->  null
 * - Apex:        `pixeocommerce.com`          ->  null
 */
export function extractSubdomain(hostname: string): string | null {
  // Strip port
  const host = hostname.split(":")[0];

  // Localhost development: mystore.localhost
  if (host.endsWith(".localhost") || host.endsWith(".local")) {
    const sub = host.split(".")[0];
    return sub && sub !== "localhost" && sub !== "local" ? sub : null;
  }

  // Plain localhost or IP
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split(".");

  // Vercel deployment URLs (e.g. project-tag.vercel.app)
  // These usually have 3 parts. If parts.length <= 3 and it's on vercel.app, it's the apex.
  if (host.endsWith("vercel.app")) {
    if (parts.length <= 3) return null;
    return parts[0];
  }

  // Production custom domains (e.g. pixeocommerce.com)
  // Apex domain (e.g. pixeocommerce.com) — no subdomain
  if (parts.length <= 2) return null;

  // First part is the subdomain (e.g. mystore.pixeocommerce.com -> mystore)
  const sub = parts[0];
  return sub || null;
}

/**
 * Resolve a hostname to either a platform app or a tenant store.
 *
 * Resolution order:
 * 1. No subdomain (apex/localhost) and it's root domain -> marketing
 * 2. Known platform subdomain (www, admin, dashboard, api) -> respective app
 * 3. Exact hostname match in store_domains -> specific store (Custom Domain)
 * 4. Any other subdomain -> look up store by subdomain in the database
 * 5. If store not found -> return unknown (caller decides fallback)
 */
export async function getStoreByHostname(
  supabase: SupabaseClient,
  hostname: string
): Promise<HostnameResolution> {
  const host = hostname.split(":")[0].toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "pixeocommerce.com";
  
  // 1. Check if it's a platform domain (apex or localhost)
  const isPlatformLocal = host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const isPlatformApex = host === rootDomain || host === `www.${rootDomain}`;
  
  if (isPlatformLocal || isPlatformApex) {
    return { type: "platform", app: "marketing" };
  }

  // 2. Check for platform subdomains (e.g. admin.pixeocommerce.com)
  const subdomain = extractSubdomain(hostname);
  if (subdomain && host.endsWith(`.${rootDomain}`) && PLATFORM_HOSTS.has(subdomain)) {
    if (subdomain === "dashboard") return { type: "platform", app: "dashboard" };
    if (subdomain === "admin") return { type: "platform", app: "admin" };
    if (subdomain === "api" || subdomain === "app") return { type: "platform", app: "api" };
    if (subdomain === "www") return { type: "platform", app: "marketing" };
  }

  // 3. Custom Domain Lookup (High priority)
  // Check if this exact hostname is registered as a custom domain
  const { data: domainData } = await supabase
    .from("store_domains")
    .select("store_id, stores (*)")
    .eq("domain", host)
    .single();

  if (domainData?.stores) {
    const store = domainData.stores as any; // The join returns an object or array
    // Supabase join structure for .single() with foreign key
    const actualStore = Array.isArray(store) ? store[0] : store;
    
    if (actualStore) {
      return { 
        type: "store", 
        subdomain: actualStore.subdomain, 
        store: actualStore as Store 
      };
    }
  }

  // 4. Subdomain Lookup (e.g. mystore.pixeocommerce.com)
  if (subdomain) {
    const { data: store } = await supabase
      .from("stores")
      .select("*")
      .eq("subdomain", subdomain)
      .single();

    if (store) {
      return { type: "store", subdomain, store: store as Store };
    }
  }

  return { type: "unknown", hostname };
}
