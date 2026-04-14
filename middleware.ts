import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getStoreByHostname } from "@/lib/stores/hostname";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware routing strategy for wildcard subdomains and custom domains.
 *
 * Support:
 * 1. *.pixeocommerce.com  ->  subdomain routing
 * 2. mystore.com          ->  custom domain routing
 *
 * Internal Rewriting:
 * - subdomain.pixeocommerce.com/path  ->  /store/[subdomain]/path
 * - customdomain.com/path             ->  /store/[subdomain]/path
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Webhooks bypass everything
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  // 2. Resolve Hostname
  const hostname = request.headers.get("host") || "";
  
  // Create a supabase client for resolution
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  const resolution = await getStoreByHostname(supabase, hostname);

  // 3. Handle Platform App vs Store
  if (resolution.type === "platform") {
    // Canonical Redirect: If on platform and visiting /store/[slug], redirect to the tenant domain
    if (pathname.startsWith("/store/")) {
      const parts = pathname.split("/");
      const storeSlug = parts[2]; // /store/[slug]
      
      if (storeSlug) {
        const restOfPath = parts.slice(3).join("/");
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "pixeocommerce.com";
        
        // Determine the target host
        const isLocal = hostname.includes("localhost") || hostname.includes(".local");
        let targetHost = "";
        
        if (isLocal) {
          const port = hostname.split(":")[1];
          targetHost = `${storeSlug}.localhost${port ? `:${port}` : ""}`;
        } else {
          targetHost = `${storeSlug}.${rootDomain}`;
        }
        
        const redirectUrl = new URL(request.url);
        redirectUrl.host = targetHost;
        redirectUrl.pathname = restOfPath ? `/${restOfPath}` : "/";
        
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Default platform behavior (auth, marketing, dashboard)
    return await updateSession(request);
  }

  // 4. Handle Tenant Store (Subdomain or Custom Domain)
  if (resolution.type === "store") {
    const { subdomain, store } = resolution;

    // CANONICAL REDIRECT: Subdomain -> Custom Domain
    // If visiting via *.pixeocommerce.com but a primary custom domain exists, redirect to it.
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "pixeocommerce.com";
    if (hostname.endsWith(`.${rootDomain}`)) {
      const { data: primaryDomain } = await supabase
        .from("store_domains")
        .select("domain")
        .eq("store_id", store.id)
        .eq("is_primary", true)
        .eq("verification_status", "verified")
        .single();
      
      if (primaryDomain?.domain) {
        const redirectUrl = new URL(request.url);
        redirectUrl.host = primaryDomain.domain;
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Don't double-rewrite if already on a /store/ path
    if (pathname.startsWith("/store/")) {
      return await updateSession(request);
    }

    // Don't rewrite API, _next, or static asset requests
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon")
    ) {
      return await updateSession(request);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/store/${subdomain}${pathname === "/" ? "" : pathname}`;

    // Rewrite (not redirect) — the URL in the browser stays unchanged
    const response = NextResponse.rewrite(url);

    // Pass the subdomain as a header so server components can read it
    response.headers.set("x-store-subdomain", subdomain);
    
    // If it's a custom domain, pass that too
    if (!hostname.endsWith(rootDomain) && !hostname.includes("localhost")) {
      response.headers.set("x-custom-domain", hostname);
    }

    return response;
  }

  // 5. Unknown hostname - just proceed as normal (likely will 404 if it's a random domain)
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
