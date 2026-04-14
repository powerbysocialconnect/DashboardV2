import { SupabaseClient } from "@supabase/supabase-js";
import type { StoreEventSource, StoreEventType } from "@/types/database";

interface LogEventInput {
  store_id: string;
  order_id?: string | null;
  customer_id?: string | null;
  source: StoreEventSource;
  event_type: StoreEventType;
  event_status?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Insert a row into store_events.
 * Uses service-role client so RLS insert policies are bypassed on webhook paths.
 * Fails silently with a console.error so callers are never broken by event logging.
 */
export async function logStoreEvent(
  supabase: SupabaseClient,
  input: LogEventInput
) {
  try {
    const { error } = await supabase.from("store_events").insert({
      store_id: input.store_id,
      order_id: input.order_id ?? null,
      customer_id: input.customer_id ?? null,
      source: input.source,
      event_type: input.event_type,
      event_status: input.event_status ?? null,
      payload: input.payload ?? {},
    });

    if (error) {
      console.error("[logStoreEvent] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[logStoreEvent] unexpected error:", err);
  }
}
