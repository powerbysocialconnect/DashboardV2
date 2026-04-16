import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveStorefront } from "@/lib/storefront/resolveStoreConfig";
import DisabledStoreView from "@/components/storefront/DisabledStoreView";
import { notFound } from "next/navigation";

interface StorefrontLayoutProps {
  children: React.ReactNode;
  params: { subdomain: string };
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const supabase = createServerSupabaseClient();
  const storefront = await resolveStorefront(supabase, params.subdomain);

  if (!storefront) {
    notFound();
  }

  if (storefront.isDisabled) {
    return <DisabledStoreView storeName={storefront.config.store.name} />;
  }

  return <>{children}</>;
}
