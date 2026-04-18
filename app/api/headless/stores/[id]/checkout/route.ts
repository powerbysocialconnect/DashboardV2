import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;

  try {
    const { items, success_url, cancel_url, discount_code, customer_details, shipping_rate_id } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // 1. Fetch store and its Stripe Connect ID
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("stripe_account_id, name, currency, stripe_connected")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (!store.stripe_connected || !store.stripe_account_id) {
      return NextResponse.json(
        { error: "Store has not completed Stripe onboarding" },
        { status: 400 }
      );
    }

    // 2. Fetch Shipping Method if provided
    let shippingRateData = null;
    if (shipping_rate_id) {
      const { data: shippingMethod } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("id", shipping_rate_id)
        .single();
      
      if (shippingMethod) {
        shippingRateData = {
          display_name: shippingMethod.name,
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: Math.round(shippingMethod.rate * 100),
            currency: store.currency.toLowerCase() || 'gbp',
          },
        };
      }
    }

    // 3. Prepare line items for Stripe and validate stock
    const lineItems = [];
    for (const item of items) {
      // Fetch relational product and variant data
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(`
          name, 
          price, 
          image_urls, 
          stock,
          product_variants(
            id, 
            sku, 
            price, 
            stock, 
            active,
            product_variant_options(
              product_option_values(
                value,
                product_option_groups(name)
              )
            )
          )
        `)
        .eq("id", item.productId)
        .single();

      if (productError || !product) {
        return NextResponse.json({
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: `Product with ID ${item.productId} was not found.`
          }
        }, { status: 404 });
      }

      // Find specific variant if requested
      const variant = item.variantId 
        ? (product.product_variants || []).find((v: any) => v.id === item.variantId) 
        : null;
      
      // Construct descriptive name
      let displayName = product.name;
      if (variant) {
        const options = (variant.product_variant_options || [])
          .map((vo: any) => vo.product_option_values?.value)
          .filter(Boolean);
        
        if (options.length > 0) {
          displayName = `${product.name} - ${options.join(" / ")}`;
        } else if (variant.sku) {
          displayName = `${product.name} (${variant.sku})`;
        }
      }
      
      // Stock Validation
      const availableStock = variant ? (variant.stock ?? 0) : (product.stock ?? 0);
      const requestedQuantity = item.quantity || 1;

      if (availableStock < requestedQuantity) {
        return NextResponse.json({
          error: {
            code: "OUT_OF_STOCK",
            message: `Not enough stock for ${displayName}. Available: ${availableStock}`
          }
        }, { status: 400 });
      }

      const price = variant ? (variant.price || product.price) : product.price;

      lineItems.push({
        price_data: {
          currency: store.currency.toLowerCase() || "usd",
          product_data: {
            name: displayName,
            images: product.image_urls?.[0] ? [product.image_urls[0]] : [],
            metadata: {
              supabase_product_id: item.productId,
              supabase_variant_id: item.variantId || "",
            },
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: requestedQuantity,
      });
    }

    // 4. Handle Discount Code
    let couponId = null;

    if (discount_code) {
      const { data: discount } = await supabase
        .from("discounts")
        .select("stripe_coupon_id, min_order_amount, is_active")
        .eq("store_id", storeId)
        .eq("code", discount_code.toUpperCase())
        .single();

      if (discount && discount.is_active) {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.price_data.unit_amount * item.quantity), 0) / 100;
        if (!discount.min_order_amount || subtotal >= discount.min_order_amount) {
          couponId = discount.stripe_coupon_id;
        } else {
          return NextResponse.json({
            error: {
              code: "DISCOUNT_MIN_AMOUNT_NOT_MET",
              message: `Discount code requires a minimum order of ${discount.min_order_amount}`
            }
          }, { status: 400 });
        }
      } else if (discount_code) {
        return NextResponse.json({
          error: {
            code: "INVALID_DISCOUNT_CODE",
            message: "The discount code provided is invalid or expired."
          }
        }, { status: 400 });
      }
    }

    // 5. Create Stripe Checkout Session
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      customer_email: customer_details?.email || undefined,
      success_url: success_url || `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${request.nextUrl.origin}/cart`,
      metadata: {
        store_id: storeId,
        headless: "true",
        type: "store_order",
        discount_code: discount_code || "",
        customer_name: `${customer_details?.firstName || ''} ${customer_details?.lastName || ''}`.trim(),
        customer_address: customer_details?.address || "",
      },
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "FR", "DE", "IT", "ES", "NL", "BE", "SE", "NO", "DK", "FI", "IE", "AT", "CH", "PT", "GR", "PL", "CZ", "HU", "NZ", "JP", "CN", "KR", "SG", "AE", "SA", "BR", "MX", "ZA"],
      },
    };

    // Add shipping option if found
    if (shippingRateData) {
      sessionParams.shipping_options = [{ shipping_rate_data: shippingRateData }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: store.stripe_account_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[headless-checkout-error]", err);
    return NextResponse.json(
      { 
        error: { 
          code: "INTERNAL_SERVER_ERROR", 
          message: err.message || "An unexpected error occurred during checkout creation." 
        } 
      },
      { status: 500 }
    );
  }
}
