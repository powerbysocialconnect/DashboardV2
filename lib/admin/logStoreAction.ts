import { SupabaseClient } from "@supabase/supabase-js";

interface StoreActionInput {
  store_id: string;
  action: string;
  details?: Record<string, unknown> | null;
  performed_by: string;
}

export async function logStoreAction(
  supabase: SupabaseClient,
  input: StoreActionInput
) {
  const { error } = await supabase.from("store_admin_actions").insert({
    store_id: input.store_id,
    action: input.action,
    details: input.details || null,
    performed_by: input.performed_by,
  });

  if (error) {
    console.error("Failed to log store action:", JSON.stringify(error, null, 2));
  }
}

export async function getStoreActions(
  supabase: SupabaseClient,
  storeId: string,
  limit = 50
) {
  try {
    // Fetch actions without the profiles join (no FK constraint exists)
    const { data, error } = await supabase
      .from("store_admin_actions")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Collect unique performed_by IDs and look up profiles separately
    const performerIds = [...new Set(data.map((a: any) => a.performed_by).filter(Boolean))];
    
    let profileMap: Record<string, { full_name: string | null; email: string }> = {};
    
    if (performerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", performerIds);
      
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }
    }

    // Merge profile data into actions
    return data.map((action: any) => ({
      ...action,
      profiles: profileMap[action.performed_by] || null,
    }));
  } catch (err) {
    console.error("Failed to fetch store actions:", err);
    return [];
  }
}

