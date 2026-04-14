import { SupabaseClient } from "@supabase/supabase-js";
import { getPlan, isTrialActive } from "./plans";
import type { Store } from "@/types/database";

export interface PlanLimitCheck {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  message?: string;
}

export async function checkProductLimit(
  supabase: SupabaseClient,
  storeId: string,
  planName: string | null
): Promise<PlanLimitCheck> {
  const plan = getPlan(planName);

  if (plan.maxProducts === -1) {
    return { allowed: true, currentCount: 0, maxAllowed: -1 };
  }

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const currentCount = count || 0;

  if (currentCount >= plan.maxProducts) {
    return {
      allowed: false,
      currentCount,
      maxAllowed: plan.maxProducts,
      message: `You've reached the ${plan.displayName} plan limit of ${plan.maxProducts} products. Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: plan.maxProducts,
  };
}

export async function checkStoreAccess(
  supabase: SupabaseClient,
  store: Store
): Promise<{ allowed: boolean; reason?: string }> {
  // Respect existing is_disabled flag (backward compat with V1/V2)
  if (store.is_disabled) {
    return { allowed: false, reason: "Store is disabled" };
  }

  // If store has a trial_ends_at and it's expired, check billing
  if (store.trial_ends_at && !isTrialActive(store.trial_ends_at)) {
    const { data: billing } = await supabase
      .from("store_billing_settings")
      .select("billing_status, stripe_subscription_id")
      .eq("store_id", store.id)
      .single();

    if (!billing?.stripe_subscription_id || billing.billing_status !== "active") {
      return {
        allowed: false,
        reason: "Trial expired. Please subscribe to continue.",
      };
    }
  }

  return { allowed: true };
}

export async function getStoreBillingState(
  supabase: SupabaseClient,
  storeId: string
) {
  const [storeRes, billingRes] = await Promise.all([
    supabase
      .from("stores")
      .select("status, trial_ends_at, is_disabled")
      .eq("id", storeId)
      .single(),
    supabase
      .from("store_billing_settings")
      .select("*")
      .eq("store_id", storeId)
      .single(),
  ]);

  const store = storeRes.data;
  const billing = billingRes.data;

  return {
    storeStatus: store?.status || "draft",
    isDisabled: store?.is_disabled || false,
    trialEndsAt: store?.trial_ends_at || null,
    trialActive: isTrialActive(store?.trial_ends_at),
    planName: billing?.plan_name || null,
    billingStatus: billing?.billing_status || null,
    subscriptionId: billing?.stripe_subscription_id || null,
  };
}
