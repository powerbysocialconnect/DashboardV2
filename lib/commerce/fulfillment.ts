import { SupabaseClient } from "@supabase/supabase-js";
import type { FulfillmentStatus, StoreEventSource } from "@/types/database";
import { logStoreEvent } from "./logStoreEvent";

const VALID_FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "unfulfilled",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

interface UpdateFulfillmentInput {
  orderId: string;
  storeId: string;
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingCarrier?: string | null;
  fulfillmentNotes?: string | null;
  updatedBy: string;
  source: StoreEventSource;
}

export function isValidFulfillmentStatus(
  status: string
): status is FulfillmentStatus {
  return VALID_FULFILLMENT_STATUSES.includes(status as FulfillmentStatus);
}

/**
 * Update order fulfillment fields.
 * Automatically sets fulfilled_at / delivered_at timestamps.
 * Logs an event to store_events and an admin action when source is "admin".
 */
export async function updateOrderFulfillment(
  supabase: SupabaseClient,
  input: UpdateFulfillmentInput
) {
  if (!isValidFulfillmentStatus(input.fulfillmentStatus)) {
    throw new Error(`Invalid fulfillment status: ${input.fulfillmentStatus}`);
  }

  const updateData: Record<string, unknown> = {
    fulfillment_status: input.fulfillmentStatus,
    updated_at: new Date().toISOString(),
  };

  if (input.trackingNumber !== undefined) {
    updateData.tracking_number = input.trackingNumber;
  }
  if (input.trackingUrl !== undefined) {
    updateData.tracking_url = input.trackingUrl;
  }
  if (input.shippingCarrier !== undefined) {
    updateData.shipping_carrier = input.shippingCarrier;
  }
  if (input.fulfillmentNotes !== undefined) {
    updateData.fulfillment_notes = input.fulfillmentNotes;
  }

  if (input.fulfillmentStatus === "shipped" || input.fulfillmentStatus === "delivered") {
    if (input.fulfillmentStatus === "shipped") {
      updateData.fulfilled_at = new Date().toISOString();
    }
    if (input.fulfillmentStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", input.orderId)
    .eq("store_id", input.storeId);

  if (error) throw error;

  // Determine the event type based on the new status
  const eventType =
    input.fulfillmentStatus === "shipped"
      ? "order.shipped"
      : input.fulfillmentStatus === "delivered"
      ? "order.delivered"
      : "order.fulfillment_updated";

  await logStoreEvent(supabase, {
    store_id: input.storeId,
    order_id: input.orderId,
    source: input.source,
    event_type: eventType as any,
    event_status: "success",
    payload: {
      fulfillment_status: input.fulfillmentStatus,
      tracking_number: input.trackingNumber ?? null,
      shipping_carrier: input.shippingCarrier ?? null,
      updated_by: input.updatedBy,
    },
  });

  // If triggered by an admin, also log to store_admin_actions for the audit trail
  if (input.source === "admin") {
    const { logStoreAction } = await import("@/lib/admin/logStoreAction");
    await logStoreAction(supabase, {
      store_id: input.storeId,
      action: `fulfillment_${input.fulfillmentStatus}`,
      details: {
        order_id: input.orderId,
        tracking_number: input.trackingNumber ?? null,
        shipping_carrier: input.shippingCarrier ?? null,
      },
      performed_by: input.updatedBy,
    });
  }

  return { success: true };
}
