import { SupabaseClient } from "@supabase/supabase-js";
import type { StoreStatus } from "@/types/database";
import { logStoreAction } from "@/lib/admin/logStoreAction";
import { addDomainToVercel } from "@/lib/vercel/domains";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "pixeocommerce.com";

export async function updateStoreStatus(
  supabase: SupabaseClient,
  storeId: string,
  newStatus: StoreStatus,
  userId: string,
  notes?: string
) {
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "live") {
    updateData.published_at = new Date().toISOString();
    updateData.launched_at = new Date().toISOString();
    updateData.is_disabled = false; // Always clear disabled flag when going live
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update(updateData)
    .eq("id", storeId);

  if (updateError) throw updateError;

  // AUTO-DOMAIN HOOK: If the store is going live, register its subdomain on Vercel
  if (newStatus === "live") {
    try {
      // 1. Fetch the store's subdomain
      const { data: store } = await supabase
        .from("stores")
        .select("subdomain")
        .eq("id", storeId)
        .single();

      if (store?.subdomain) {
        const fullDomain = `${store.subdomain}.${ROOT_DOMAIN}`;
        console.log(`[Vercel Automation] Registering domain: ${fullDomain}`);
        
        // 2. Call the Vercel API
        const result = await addDomainToVercel(fullDomain);
        
        if (result.error) {
          console.error(`[Vercel Automation] Failed to register domain: ${result.error}`);
        } else {
          console.log(`[Vercel Automation] Success: ${fullDomain} registered.`);
        }
      }
    } catch (err) {
      console.error("[Vercel Automation] Unexpected error during domain registration:", err);
      // We don't throw here because we don't want to break the store status update 
      // just because the Vercel API call failed.
    }
  }

  // Record in status history
  const { error: historyError } = await supabase
    .from("store_status_history")
    .insert({
      store_id: storeId,
      status: newStatus,
      notes: notes || null,
      changed_by: userId,
    });

  if (historyError) throw historyError;

  await logStoreAction(supabase, {
    store_id: storeId,
    action: `status_changed_to_${newStatus}`,
    details: { new_status: newStatus, notes },
    performed_by: userId,
  });

  return { success: true };
}

export async function publishStore(
  supabase: SupabaseClient,
  storeId: string,
  userId: string
) {
  return updateStoreStatus(supabase, storeId, "live", userId, "Store published");
}

export async function disableStore(
  supabase: SupabaseClient,
  storeId: string,
  userId: string,
  reason?: string
) {
  // Also set the existing is_disabled flag for backward compatibility
  await supabase
    .from("stores")
    .update({ is_disabled: true })
    .eq("id", storeId);

  return updateStoreStatus(
    supabase,
    storeId,
    "disabled",
    userId,
    reason || "Store disabled by admin"
  );
}

export async function enableStore(
  supabase: SupabaseClient,
  storeId: string,
  userId: string
) {
  await supabase
    .from("stores")
    .update({ is_disabled: false })
    .eq("id", storeId);

  return updateStoreStatus(supabase, storeId, "live", userId, "Store re-enabled");
}
