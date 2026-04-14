import { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Resolve a store_id from a Stripe event.
 *
 * Strategy (tried in order):
 * 1. metadata.store_id on the session/payment intent/charge
 * 2. Look up the order by stripe_session_id
 * 3. Look up the order by stripe_payment_intent_id
 *
 * Returns { storeId, orderId } or null if nothing could be resolved.
 */
export async function resolveStoreFromStripeEvent(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<{ storeId: string; orderId: string | null } | null> {
  const obj = event.data.object as unknown as Record<string, unknown>;

  // 1. Try metadata.store_id (set during checkout session creation)
  const metadata = (obj.metadata as Record<string, string>) ?? {};
  if (metadata.store_id) {
    return {
      storeId: metadata.store_id,
      orderId: (metadata.order_id as string) ?? null,
    };
  }

  // 1b. If it's a Stripe Connect event, we can resolve the store via the account ID
  if (event.account) {
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("stripe_account_id", event.account)
      .single();

    if (store) {
      return {
        storeId: store.id,
        orderId: (metadata.order_id as string) ?? null,
      };
    }
  }

  // 2. For checkout.session.completed, look up by session id
  if (event.type === "checkout.session.completed" && obj.id) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, store_id")
      .eq("stripe_session_id", obj.id as string)
      .single();

    if (order) {
      return { storeId: order.store_id, orderId: order.id };
    }
  }

  // 3. For payment_intent / charge events, resolve via payment_intent id
  const paymentIntentId =
    (obj.payment_intent as string) ?? // charge events
    (obj.id as string); // payment_intent events have .id

  if (paymentIntentId && typeof paymentIntentId === "string" && paymentIntentId.startsWith("pi_")) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, store_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (order) {
      return { storeId: order.store_id, orderId: order.id };
    }
  }

  // 4. For charge.refunded, the charge object has a payment_intent field
  if (event.type === "charge.refunded") {
    const charge = obj as unknown as Stripe.Charge;
    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent as Stripe.PaymentIntent)?.id;

    if (piId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, store_id")
        .eq("stripe_payment_intent_id", piId)
        .single();

      if (order) {
        return { storeId: order.store_id, orderId: order.id };
      }
    }
  }

  console.warn(
    `[resolveStoreFromStripeEvent] Could not resolve store for ${event.type} (${event.id})`
  );
  return null;
}
