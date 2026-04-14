import { SupabaseClient } from "@supabase/supabase-js";
import type { RefundStatus } from "@/types/database";
import { logStoreEvent } from "./logStoreEvent";

interface HandleRefundInput {
  orderId: string;
  storeId: string;
  refundedAmount: number;
  orderTotal: number;
  stripeRefundId?: string;
  reason?: string;
}

/**
 * Handle a refund event.
 * Updates refund fields on the order and logs to store_events.
 * Determines partial vs full refund based on amounts.
 */
export async function handleRefundEvent(
  supabase: SupabaseClient,
  input: HandleRefundInput
) {
  const refundStatus: RefundStatus =
    input.refundedAmount >= input.orderTotal ? "full" : "partial";

  const { error } = await supabase
    .from("orders")
    .update({
      refund_status: refundStatus,
      refunded_amount: input.refundedAmount,
      refunded_at: new Date().toISOString(),
      // If fully refunded, also update the order status
      ...(refundStatus === "full" ? { status: "refunded" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId)
    .eq("store_id", input.storeId);

  if (error) {
    console.error("[handleRefundEvent] order update failed:", error.message);
    throw error;
  }

  await logStoreEvent(supabase, {
    store_id: input.storeId,
    order_id: input.orderId,
    source: "stripe",
    event_type: "order.refunded",
    event_status: "success",
    payload: {
      refund_status: refundStatus,
      refunded_amount: input.refundedAmount,
      order_total: input.orderTotal,
      stripe_refund_id: input.stripeRefundId ?? null,
      reason: input.reason ?? null,
    },
  });

  return { refundStatus, success: true };
}
