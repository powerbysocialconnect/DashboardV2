import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/dashboard/stores/[id]/connect-stripe
 * Initializes Stripe Connect onboarding for a merchant store.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  const supabase = createAdminClient();

  try {
    // 1. Fetch store and current stripe_account_id
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, stripe_account_id, currency")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let accountId = store.stripe_account_id;

    // 2. Create Stripe Account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard", // Standard Connect is best for this use case
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" },
          },
        },
        metadata: {
          store_id: storeId,
          platform: "PixeoCommerce",
        },
      });

      accountId = account.id;

      // Update store with the new account ID
      await supabase
        .from("stores")
        .update({ stripe_account_id: accountId })
        .eq("id", storeId);
    }

    // 3. Create Account Link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.pixeocommerce.com";
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/dashboard/stores/${storeId}/connect-stripe/refresh`,
      return_url: `${baseUrl}/api/dashboard/stores/${storeId}/connect-stripe/callback`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[connect-stripe] Initialization error:", error);
    const message = error instanceof Error ? error.message : "Failed to initialize Stripe Connect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
