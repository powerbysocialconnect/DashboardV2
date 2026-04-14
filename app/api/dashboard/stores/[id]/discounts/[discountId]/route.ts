import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, discountId: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;
  const discountId = params.discountId;

  try {
    // 1. Fetch the discount to get Stripe ID and verify ownership
    const { data: discount, error: fetchError } = await supabase
      .from("discounts")
      .select("*")
      .eq("id", discountId)
      .eq("store_id", storeId)
      .single();

    if (fetchError || !discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    // 2. Delete from Stripe if a coupon ID exists
    if (discount.stripe_coupon_id) {
      const { data: store } = await supabase
        .from("stores")
        .select("stripe_account_id")
        .eq("id", storeId)
        .single();

      if (store?.stripe_account_id) {
        try {
          await stripe.coupons.del(discount.stripe_coupon_id, {
            stripeAccount: store.stripe_account_id,
          });
        } catch (stripeErr) {
          console.error("Failed to delete Stripe coupon:", stripeErr);
        }
      }
    }

    // 3. Delete from Supabase
    const { error: deleteError } = await supabase
      .from("discounts")
      .delete()
      .eq("id", discountId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string, discountId: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;
  const discountId = params.discountId;

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
      expires_at,
      is_active
    } = body;

    // 1. Fetch current discount and store details
    const { data: discount, error: fetchError } = await supabase
      .from("discounts")
      .select("*")
      .eq("id", discountId)
      .eq("store_id", storeId)
      .single();

    if (fetchError || !discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("stripe_account_id, currency")
      .eq("id", storeId)
      .single();

    if (storeError || !store || !store.stripe_account_id) {
      return NextResponse.json({ error: "Store not found or Stripe not connected" }, { status: 400 });
    }

    let currentStripeId = discount.stripe_coupon_id;

    // 2. Determine if we need to recreate the Stripe coupon
    // Stripe coupons are largely immutable. If core fields change, we recreate.
    const needsRecreation = 
      code !== discount.code || 
      type !== discount.type || 
      value !== discount.value || 
      max_uses !== discount.max_uses;

    if (needsRecreation) {
      // Delete old coupon
      if (discount.stripe_coupon_id) {
        try {
          await stripe.coupons.del(discount.stripe_coupon_id, {
            stripeAccount: store.stripe_account_id,
          });
        } catch (e) {
          console.error("Cleanup old coupon failed:", e);
        }
      }

      // Create new coupon
      const stripeParams: any = {
        name: `${code} (${value}${type === "percentage" ? "%" : " " + store.currency})`,
        duration: "forever",
        id: `${code}_${Date.now()}`,
        metadata: { description: description || "" }
      };

      if (max_uses) stripeParams.max_redemptions = parseInt(max_uses);
      if (type === "percentage") {
        stripeParams.percent_off = value;
      } else {
        stripeParams.amount_off = Math.round(value * 100);
        stripeParams.currency = store.currency.toLowerCase();
      }

      const coupon = await stripe.coupons.create(stripeParams, {
        stripeAccount: store.stripe_account_id,
      });
      currentStripeId = coupon.id;
    } else {
      // Update metadata only if just description or status changed
      if (discount.stripe_coupon_id) {
        try {
          await stripe.coupons.update(discount.stripe_coupon_id, {
            metadata: { description: description || "" }
          }, {
            stripeAccount: store.stripe_account_id,
          });
        } catch (e) {
          console.error("Update Stripe coupon failed:", e);
        }
      }
    }

    // 3. Update Supabase
    const { data: updatedDiscount, error: updateError } = await supabase
      .from("discounts")
      .update({
        code: code.toUpperCase(),
        description: description || null,
        type,
        value,
        min_order_amount,
        max_uses,
        starts_at,
        expires_at,
        is_active,
        stripe_coupon_id: currentStripeId,
      })
      .eq("id", discountId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ discount: updatedDiscount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
