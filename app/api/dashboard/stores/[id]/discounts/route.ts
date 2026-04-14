import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  const { data: discounts, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ discounts });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  try {
    const body = await request.json();
    const { 
      code, 
      description,
      type, 
      value, 
      min_order_amount, 
      max_uses,
      starts_at,
      expires_at 
    } = body;

    // 1. Fetch store for currency and stripe account
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("stripe_account_id, currency")
      .eq("id", storeId)
      .single();

    if (storeError || !store || !store.stripe_account_id) {
      return NextResponse.json({ error: "Store not connected to Stripe" }, { status: 400 });
    }

    // 2. Create Coupon in Stripe (Connected Account)
    const stripeParams: any = {
      name: `${code} (${value}${type === "percentage" ? "%" : " " + store.currency})`,
      duration: "forever",
      id: `${code}_${Date.now()}`, // Optional: unique ID in Stripe
      metadata: {
        description: description || "",
      }
    };

    if (max_uses) {
      stripeParams.max_redemptions = parseInt(max_uses);
    }

    if (type === "percentage") {
      stripeParams.percent_off = value;
    } else {
      stripeParams.amount_off = Math.round(value * 100);
      stripeParams.currency = store.currency.toLowerCase();
    }

    const coupon = await stripe.coupons.create(stripeParams, {
      stripeAccount: store.stripe_account_id,
    });

    // 3. Save to Supabase
    const { data: discount, error: discountError } = await supabase
      .from("discounts")
      .insert({
        store_id: storeId,
        code: code.toUpperCase(),
        description: description || null,
        type,
        value,
        min_order_amount,
        max_uses,
        starts_at,
        expires_at,
        stripe_coupon_id: coupon.id,
        is_active: true,
      })
      .select()
      .single();

    if (discountError) {
      // Cleanup Stripe coupon if DB save fails
      await stripe.coupons.del(coupon.id, { stripeAccount: store.stripe_account_id });
      return NextResponse.json({ error: discountError.message }, { status: 400 });
    }

    return NextResponse.json({ discount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
