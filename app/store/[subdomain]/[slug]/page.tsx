import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CoreLayout } from "@/components/themes/core/CoreLayout";
import { PageSectionsRenderer } from "@/components/storefront/sections/SectionRenderer";
import type { StorePage, Store, Product } from "@/types/database";
import { resolveStorefront } from "@/lib/storefront/resolveStoreConfig";

interface PageProps {
  params: { subdomain: string; slug: string };
  searchParams: { preview?: string };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) {
    return { title: "Store Not Found" };
  }

  // Fetch the page for metadata
  const isPreview = searchParams.preview === "true";
  const query = supabase
    .from("store_pages")
    .select("title, seo_title, seo_description")
    .eq("store_id", storefront.config.store.id)
    .eq("slug", params.slug);

  if (!isPreview) {
    query.eq("is_published", true);
  }

  const { data: page } = await query.maybeSingle();

  if (!page) {
    return { title: `${storefront.config.store.name} - Page Not Found` };
  }

  return {
    title: page.seo_title || `${page.title} — ${storefront.config.store.name}`,
    description:
      page.seo_description ||
      `${page.title} at ${storefront.config.store.name}`,
    openGraph: {
      title: page.seo_title || page.title,
      description: page.seo_description || undefined,
      type: "website",
    },
  };
}

export default async function StorePageRoute({
  params,
  searchParams,
}: PageProps) {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) {
    notFound();
  }

  const { config, products, headerPages, footerPages } = storefront;
  const store = config.store;
  const isPreview = searchParams.preview === "true";

  // If preview mode, verify the user is an admin
  let isAdmin = false;
  if (isPreview) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      isAdmin = !!profile?.is_admin;
    }
  }

  // Fetch the page — scoped to THIS store only
  const query = supabase
    .from("store_pages")
    .select("*")
    .eq("store_id", store.id)
    .eq("slug", params.slug);

  // Only show published pages to non-admin visitors
  if (!isPreview || !isAdmin) {
    query.eq("is_published", true);
  }

  const { data: pageData } = await query.maybeSingle();

  if (!pageData) {
    notFound();
  }

  const page = pageData as StorePage;

  return (
    <CoreLayout
      store={{
        name: store.name,
        logo_url: store.logo_url,
        description: store.description,
        currency: store.currency || "USD",
      }}
      currency={store.currency || "USD"}
      products={products}
      headerPages={headerPages}
      footerPages={footerPages}
    >
      {/* Draft Preview Banner */}
      {!page.is_published && isAdmin && (
        <div className="bg-amber-400 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          ⚠ Draft Preview — This page is not published
        </div>
      )}

      {/* Page Sections */}
      <PageSectionsRenderer sections={page.content_json || []} />
    </CoreLayout>
  );
}
