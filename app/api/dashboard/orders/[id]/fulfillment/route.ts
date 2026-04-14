import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { updateOrderFulfillment, isValidFulfillmentStatus } from "@/lib/commerce/fulfillment";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify merchant owns this order's store
    const { data: order } = await supabase
      .from("orders")
      .select("store_id, stores!inner(owner_id)")
      .eq("id", params.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const storeOwner = (order as any).stores?.owner_id;
    if (storeOwner !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      fulfillment_status,
      tracking_number,
      tracking_url,
      shipping_carrier,
      fulfillment_notes,
    } = body;

    if (!fulfillment_status || !isValidFulfillmentStatus(fulfillment_status)) {
      return NextResponse.json(
        {
          error: `Invalid fulfillment_status. Allowed: unfulfilled, processing, shipped, delivered, cancelled, returned`,
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    await updateOrderFulfillment(adminClient, {
      orderId: params.id,
      storeId: order.store_id,
      fulfillmentStatus: fulfillment_status,
      trackingNumber: tracking_number,
      trackingUrl: tracking_url,
      shippingCarrier: shipping_carrier,
      fulfillmentNotes: fulfillment_notes,
      updatedBy: user.id,
      source: "dashboard",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
