import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * PUT /api/admin/stores/[id]/owner
 * Update the owner of a store.
 * Admins only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  const { ownerId } = await request.json();

  if (!ownerId) {
    return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const adminClient = createAdminClient();

  // 1. Verify admin status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  // 2. Perform ownership update
  const { error: updateError } = await adminClient
    .from("stores")
    .update({ owner_id: ownerId })
    .eq("id", storeId);

  if (updateError) {
    console.error("[admin-owner-update] Update error:", updateError.message);
    return NextResponse.json({ error: "Failed to update store owner" }, { status: 500 });
  }

  // 3. Log the action
  await adminClient.from("store_admin_actions").insert({
    store_id: storeId,
    action: "owner_changed",
    details: { new_owner_id: ownerId, performed_by: user.email },
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}
