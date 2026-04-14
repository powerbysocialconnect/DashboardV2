import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";

/**
 * PUT /api/admin/stores/[id]/plan
 * Update the billing plan for a store.
 * Admins only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  const { planName } = await request.json();

  if (!planName) {
    return NextResponse.json({ error: "Missing planName" }, { status: 400 });
  }

  // Validate plan exists
  const plan = PLANS[planName.toLowerCase()];
  if (!plan) {
    return NextResponse.json(
      { error: `Invalid plan: ${planName}. Valid plans: ${Object.keys(PLANS).join(", ")}` },
      { status: 400 }
    );
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

  // 2. Fetch store to get owner_id
  const { data: store, error: storeError } = await adminClient
    .from("stores")
    .select("id, owner_id")
    .eq("id", storeId)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // 3. Upsert store_billing_settings
  const billingData = {
    store_id: storeId,
    plan_name: plan.name,
    subscription_plan: plan.name,
    billing_status: plan.priceMonthly === 0 ? "free" : "active",
    subscription_status: plan.priceMonthly === 0 ? "free" : "active",
  };

  const { error: billingError } = await adminClient
    .from("store_billing_settings")
    .upsert(billingData, { onConflict: "store_id" });

  if (billingError) {
    console.error("[admin-plan-update] Billing update error:", billingError.message);
    return NextResponse.json({ error: "Failed to update billing settings" }, { status: 500 });
  }

  // 4. Update owner profile subscription info
  if (store.owner_id) {
    await adminClient
      .from("profiles")
      .update({
        subscription_plan: plan.name,
        subscription_status: plan.priceMonthly === 0 ? "free" : "active",
      })
      .eq("id", store.owner_id);
  }

  // 5. Log the action
  await adminClient.from("store_admin_actions").insert({
    store_id: storeId,
    action: "plan_changed",
    details: {
      new_plan: plan.name,
      display_name: plan.displayName,
      transaction_fee: plan.transactionFeePercent,
      performed_by: user.email,
    },
    performed_by: user.id,
  });

  return NextResponse.json({
    success: true,
    plan: {
      name: plan.name,
      displayName: plan.displayName,
      transactionFeePercent: plan.transactionFeePercent,
      priceMonthly: plan.priceMonthly,
    },
  });
}
