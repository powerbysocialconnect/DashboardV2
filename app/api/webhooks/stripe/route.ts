import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveStoreFromStripeEvent } from "@/lib/commerce/resolveStore";
import { logStoreEvent } from "@/lib/commerce/logStoreEvent";
import { handleRefundEvent } from "@/lib/commerce/refund";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

/**
 * Single Stripe webhook for all stores.
 *
 * Handles:
 * - checkout.session.completed  (existing V1/V2 flow preserved)
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 *
 * Each handler:
 * 1. Resolves the store_id safely
 * 2. Inserts a store_events row
 * 3. Performs any order updates needed
 * 4. Never throws — returns 200 to Stripe even if sub-steps fail
 */
export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    // 1. Get exact raw body as Buffer for byte-perfect signature verification
    const arrayBuffer = await request.arrayBuffer();
    const rawBody = Buffer.from(arrayBuffer);
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("[stripe-webhook] Verification error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(supabase, event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(supabase, event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(supabase, event);
        break;

      default:
        // Unhandled event types — log but do not error
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Log but always return 200 so Stripe doesn't retry indefinitely
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// Preserves existing V1/V2 behavior: order creation + inventory decrement.
// Additionally stores payment_intent_id on the order and logs an event.
// ---------------------------------------------------------------------------
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  console.log("[stripe-webhook] NEW VERSION RUNNING");
  const session = event.data.object as Stripe.Checkout.Session;
  const resolved = await resolveStoreFromStripeEvent(supabase, event);

  if (!resolved) {
    console.warn("[checkout.session.completed] Could not resolve store");
    return;
  }

  // 1. Check if an order already exists for this session (hollow order created by storefront)
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .single();

  const stripe = getStripe();
  console.log(`[stripe-webhook] Processing ${session.id} (Existing order: ${existingOrder?.id || "No"})`);

  // 2. Retrieve the FULL expanded session
  const fullSession = await stripe.checkout.sessions.retrieve(
    session.id,
    {
      expand: [
        "line_items",
        "line_items.data.price.product",
        "payment_intent",
        "shipping_cost",
      ],
    },
    event.account ? { stripeAccount: event.account } : undefined
  );

  const metadata = fullSession.metadata ?? {};

  // 3. Metadata Guard: Only process store purchases
  if (metadata.type !== "store_order" && metadata.headless !== "true") {
    console.log(`[stripe-webhook] Ignoring non-store-order session: ${session.id}`);
    return;
  }



  // 4. Build local products array from expanded line items
  const lineItems = fullSession.line_items?.data ?? [];
  const productsArray = lineItems.map(item => {
    const stripeProduct = item.price?.product as Stripe.Product;
    const prodMetadata = stripeProduct.metadata || {};
    return {
      product_id: prodMetadata.supabase_product_id || metadata[`product_${item.id}`] || null,
      variant_id: prodMetadata.supabase_variant_id || null,
      quantity: item.quantity ?? 1,
      price: (item.amount_total ?? 0) / 100,
      unit_price: (item.price?.unit_amount ?? 0) / 100,
      name: stripeProduct.name,
      image: stripeProduct.images?.[0] || null,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: item.price?.id
    };
  });

  // 5. Extract Best Available Address
  const addressObj = fullSession.shipping_details?.address || fullSession.customer_details?.address || null;

  // 6. Resolve or Create Customer if missing
  let customerId = metadata.customer_id || null;
  if (!customerId && fullSession.customer_details?.email) {
    const customerEmail = fullSession.customer_details.email;
    const customerName = fullSession.customer_details.name || metadata.customer_name || "Guest";
    
    console.log(`[stripe-webhook] Resolving customer for email: ${customerEmail}`);
    
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", resolved.storeId)
      .eq("email", customerEmail)
      .single();

    if (existingCustomer) {
      console.log(`[stripe-webhook] Found existing customer: ${existingCustomer.id}`);
      customerId = existingCustomer.id;
    } else {
      console.log(`[stripe-webhook] Creating new customer record...`);
      const { data: newCust, error: custRepoError } = await supabase
        .from("customers")
        .insert({
          store_id: resolved.storeId,
          email: customerEmail,
          name: customerName,
          address: addressObj
        })
        .select("id")
        .single();
      
      if (!custRepoError && newCust) {
        customerId = newCust.id;
      } else {
        console.warn(`[stripe-webhook] Customer creation failed:`, custRepoError?.message);
      }
    }
  }

  // 6. Create or Enrich the order
  let order;
  const orderData = {
    store_id: resolved.storeId,
    customer_id: customerId,
    status: "paid",
    total: (fullSession.amount_total ?? 0) / 100,
    subtotal: (fullSession.amount_subtotal ?? 0) / 100,
    tax: 0,
    shipping_cost: (fullSession.shipping_cost?.amount_total ?? 0) / 100,
    discount_amount: (fullSession.total_details?.amount_discount ?? 0) / 100,
    currency: fullSession.currency?.toUpperCase() ?? "USD",
    stripe_session_id: fullSession.id,
    stripe_payment_intent_id:
      typeof fullSession.payment_intent === "string"
        ? fullSession.payment_intent
        : (fullSession.payment_intent as Stripe.PaymentIntent)?.id ?? null,
    fulfillment_status: "unfulfilled",
    products: productsArray,
    address: addressObj
  };

  try {
    if (existingOrder) {
      console.log(`[stripe-webhook] Enriching existing order: ${existingOrder.id}`);
      const { data, error: updateError } = await supabase
        .from("orders")
        .update(orderData)
        .eq("id", existingOrder.id)
        .select("id")
        .single();

      if (updateError) throw updateError;
      order = data;
    } else {
      console.log(`[stripe-webhook] Creating new order for session: ${fullSession.id}`);
      const { data, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select("id")
        .single();

      if (orderError) throw orderError;
      order = data;
    }
  } catch (err: any) {
    if (err.code === "23505") {
      console.log(`[stripe-webhook] Conflict detected, order likely handled by parallel webhook: ${fullSession.id}`);
      return;
    }
    console.error(`[stripe-webhook] CRITICAL: Order process failed!`, err);
    return;
  }

  // 7. Create individual order items + decrement inventory
  for (const item of lineItems) {
    const stripeProduct = item.price?.product as Stripe.Product;
    const prodMetadata = stripeProduct.metadata || {};
    const productId = prodMetadata.supabase_product_id || metadata[`product_${item.id}`] || null;
    const variantId = prodMetadata.supabase_variant_id || null;

    // Check for existing item to avoid duplicates (idempotency within order)
    const { data: existingItem } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", order.id)
      .eq("product_id", productId)
      .eq("variant_id", variantId)
      .single();

    if (existingItem) {
      console.log(`[stripe-webhook] Order item already exists, skipping: ${productId}`);
      continue;
    }

    console.log(`[stripe-webhook] Inserting order_items for: ${productId}`);
    const { error: itemsError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: productId,
      variant_id: variantId,
      quantity: item.quantity ?? 1,
      unit_price: (item.price?.unit_amount ?? 0) / 100,
      total_price: (item.amount_total ?? 0) / 100,
    });

    if (itemsError) {
      console.error(`[stripe-webhook] order_items insert failed:`, itemsError);
    }

    // Decrement stock
    if (productId && item.quantity) {
      try {
        if (variantId) {
          const { data: prod } = await supabase.from("products").select("variants").eq("id", productId).single();
          if (prod?.variants) {
            const updatedVariants = prod.variants.map((v: any) => v.id === variantId ? { ...v, stock: Math.max(0, (v.stock || 0) - (item.quantity ?? 1)) } : v);
            await supabase.from("products").update({ variants: updatedVariants }).eq("id", productId);
          }
        } else {
          await supabase.rpc("decrement_stock", {
            p_product_id: productId,
            p_quantity: item.quantity,
          });
        }
      } catch (err) {
        console.warn(`[stripe-webhook] Stock decrement skipped for ${productId}:`, err);
      }
    }
  }

  await logStoreEvent(supabase, {
    store_id: resolved.storeId,
    order_id: order.id,
    customer_id: customerId,
    source: "stripe",
    event_type: "checkout.session.completed",
    event_status: "success",
    payload: {
      stripe_session_id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });

  await logStoreEvent(supabase, {
    store_id: resolved.storeId,
    order_id: order.id,
    customer_id: customerId,
    source: "system",
    event_type: "order.created",
    event_status: "success",
    payload: { order_id: order.id },
  });
}

// ---------------------------------------------------------------------------
// payment_intent.succeeded
// ---------------------------------------------------------------------------
async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const resolved = await resolveStoreFromStripeEvent(supabase, event);
  if (!resolved) return;

  await logStoreEvent(supabase, {
    store_id: resolved.storeId,
    order_id: resolved.orderId,
    source: "stripe",
    event_type: "payment.succeeded",
    event_status: "success",
    payload: {
      stripe_event_id: event.id,
      payment_intent_id: (event.data.object as Stripe.PaymentIntent).id,
    },
  });

  // Mark order as paid if it exists and isn't already
  if (resolved.orderId) {
    await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", resolved.orderId)
      .in("status", ["pending", "processing"]);
  }
}

// ---------------------------------------------------------------------------
// payment_intent.payment_failed
// ---------------------------------------------------------------------------
async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const resolved = await resolveStoreFromStripeEvent(supabase, event);
  if (!resolved) return;

  const pi = event.data.object as Stripe.PaymentIntent;

  await logStoreEvent(supabase, {
    store_id: resolved.storeId,
    order_id: resolved.orderId,
    source: "stripe",
    event_type: "payment.failed",
    event_status: "failed",
    payload: {
      stripe_event_id: event.id,
      payment_intent_id: pi.id,
      failure_code: pi.last_payment_error?.code ?? null,
      failure_message: pi.last_payment_error?.message ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// charge.refunded
// ---------------------------------------------------------------------------
async function handleChargeRefunded(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
) {
  const charge = event.data.object as Stripe.Charge;
  const resolved = await resolveStoreFromStripeEvent(supabase, event);

  if (!resolved) {
    console.warn("[charge.refunded] Could not resolve store for charge:", charge.id);
    return;
  }

  if (!resolved.orderId) {
    // Log the event even if we can't find the order
    await logStoreEvent(supabase, {
      store_id: resolved.storeId,
      source: "stripe",
      event_type: "order.refunded",
      event_status: "warning",
      payload: {
        stripe_event_id: event.id,
        charge_id: charge.id,
        note: "Order not found for refund event",
      },
    });
    return;
  }

  // Get the order total to determine partial vs full refund
  const { data: order } = await supabase
    .from("orders")
    .select("total")
    .eq("id", resolved.orderId)
    .single();

  const refundedAmount = (charge.amount_refunded ?? 0) / 100;
  const orderTotal = order?.total ?? refundedAmount;

  // Get the latest refund id
  const latestRefund = charge.refunds?.data?.[0];

  await handleRefundEvent(supabase, {
    orderId: resolved.orderId,
    storeId: resolved.storeId,
    refundedAmount,
    orderTotal,
    stripeRefundId: latestRefund?.id,
    reason: latestRefund?.reason ?? undefined,
  });
}
