import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import {
  publishStore,
  disableStore,
  enableStore,
  updateStoreStatus,
} from "@/lib/stores/publishStore";
import type { StoreStatus } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { storeId, action, notes, trialEndDate } = await request.json();

    if (!storeId || !action) {
      return NextResponse.json(
        { error: "storeId and action are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    switch (action) {
      case "publish":
        await publishStore(adminClient, storeId, user.id);
        break;

      case "disable":
        await disableStore(adminClient, storeId, user.id, notes);
        break;

      case "enable":
        await enableStore(adminClient, storeId, user.id);
        break;

      case "extend_trial":
        if (!trialEndDate) {
          return NextResponse.json(
            { error: "trialEndDate is required for extend_trial" },
            { status: 400 }
          );
        }
        await adminClient
          .from("stores")
          .update({ trial_ends_at: trialEndDate })
          .eq("id", storeId);

        // Also update billing settings table trial date
        await adminClient
          .from("store_billing_settings")
          .update({ trial_end: trialEndDate })
          .eq("store_id", storeId);

        const { logStoreAction } = await import("@/lib/admin/logStoreAction");
        await logStoreAction(adminClient, {
          store_id: storeId,
          action: "trial_extended",
          details: { new_trial_end: trialEndDate, notes },
          performed_by: user.id,
        });
        break;

      default: {
        const validStatuses: StoreStatus[] = [
          "draft",
          "vision_submitted",
          "building",
          "review_ready",
          "live",
          "maintenance",
          "disabled",
        ];
        if (validStatuses.includes(action as StoreStatus)) {
          await updateStoreStatus(
            adminClient,
            storeId,
            action as StoreStatus,
            user.id,
            notes
          );
        } else {
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
