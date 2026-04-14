import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { logStoreAction } from "@/lib/admin/logStoreAction";

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

    const { storeId, action, trialEndDate, notes } = await request.json();

    if (!storeId || !action) {
      return NextResponse.json(
        { error: "storeId and action required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    switch (action) {
      case "extend_trial": {
        if (!trialEndDate) {
          return NextResponse.json(
            { error: "trialEndDate required" },
            { status: 400 }
          );
        }
        await adminClient
          .from("stores")
          .update({ trial_ends_at: trialEndDate })
          .eq("id", storeId);

        await logStoreAction(adminClient, {
          store_id: storeId,
          action: "trial_extended",
          details: { new_trial_end: trialEndDate, notes },
          performed_by: user.id,
        });
        break;
      }

      case "comp_free_month": {
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 30);

        await adminClient
          .from("stores")
          .update({ trial_ends_at: newEnd.toISOString() })
          .eq("id", storeId);

        await logStoreAction(adminClient, {
          store_id: storeId,
          action: "free_month_comped",
          details: { new_trial_end: newEnd.toISOString(), notes },
          performed_by: user.id,
        });
        break;
      }

      case "disable_store": {
        await adminClient
          .from("stores")
          .update({ is_disabled: true, status: "disabled" })
          .eq("id", storeId);

        await adminClient.from("store_status_history").insert({
          store_id: storeId,
          status: "disabled",
          notes: notes || "Disabled by admin via billing controls",
          changed_by: user.id,
        });

        await logStoreAction(adminClient, {
          store_id: storeId,
          action: "store_disabled_billing",
          details: { reason: notes || "Billing action" },
          performed_by: user.id,
        });
        break;
      }

      case "enable_store": {
        await adminClient
          .from("stores")
          .update({ is_disabled: false, status: "live" })
          .eq("id", storeId);

        await adminClient.from("store_status_history").insert({
          store_id: storeId,
          status: "live",
          notes: "Re-enabled by admin via billing controls",
          changed_by: user.id,
        });

        await logStoreAction(adminClient, {
          store_id: storeId,
          action: "store_enabled_billing",
          details: { notes },
          performed_by: user.id,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
