import { SupabaseClient } from "@supabase/supabase-js";
import type { Store, StoreWithConfig } from "@/types/database";

export async function getStoresByOwner(
  supabase: SupabaseClient,
  ownerId: string
): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Store[];
}

export async function getStoreWithConfig(
  supabase: SupabaseClient,
  storeId: string
): Promise<StoreWithConfig | null> {
  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error || !store) return null;

  const [themeConfigRes, tasksRes, domainsRes] = await Promise.all([
    supabase
      .from("store_theme_configs")
      .select("*")
      .eq("store_id", storeId)
      .single(),
    supabase
      .from("store_onboarding_tasks")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at"),
    supabase
      .from("store_domains")
      .select("*")
      .eq("store_id", storeId)
      .order("is_primary", { ascending: false }),
  ]);

  return {
    ...(store as Store),
    theme_config: themeConfigRes.data || null,
    onboarding_tasks: tasksRes.data || [],
    domains: domainsRes.data || [],
  };
}
