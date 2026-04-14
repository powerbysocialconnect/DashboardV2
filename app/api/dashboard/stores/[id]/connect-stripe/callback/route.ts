import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { completeOnboardingTask } from "@/lib/stores/onboarding";

/**
 * GET /api/dashboard/stores/[id]/connect-stripe/callback
 * Handles the return from Stripe after onboarding.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  const supabase = createAdminClient();

  try {
    // 1. Fetch store to get the account ID
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("stripe_account_id")
      .eq("id", storeId)
      .single();

    if (storeError || !store?.stripe_account_id) {
      console.error("[connect-stripe-callback] Store or Account ID not found");
      return NextResponse.redirect(new URL("/dashboard/settings?stripe=error", request.nextUrl.origin));
    }

    // 2. Retrieve account details from Stripe to verify status
    const account = await stripe.accounts.retrieve(store.stripe_account_id);

    if (account.details_submitted) {
      // 3. Mark the store as connected in the database
      await supabase
        .from("stores")
        .update({ stripe_connected: true })
        .eq("id", storeId);

      // 4. Mark the onboarding task as completed
      try {
        await completeOnboardingTask(supabase, storeId, "connect_payments");
      } catch (err) {
        console.warn("[connect-stripe-callback] Could not mark task as completed:", err);
      }

      return NextResponse.redirect(new URL("/dashboard/settings?stripe=connected", request.nextUrl.origin));
    } else {
      // Not fully finished
      return NextResponse.redirect(new URL("/dashboard/settings?stripe=incomplete", request.nextUrl.origin));
    }
  } catch (error) {
    console.error("[connect-stripe-callback] Error:", error);
    return NextResponse.redirect(new URL("/dashboard/settings?stripe=error", request.nextUrl.origin));
  }
}
