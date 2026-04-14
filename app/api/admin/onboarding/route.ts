import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import {
  createDefaultOnboardingTasks,
  completeOnboardingTask,
} from "@/lib/stores/onboarding";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, action, taskKey } = await request.json();

    if (!storeId || !action) {
      return NextResponse.json(
        { error: "storeId and action required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify user owns the store or is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    if (!isAdmin) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("id", storeId)
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    switch (action) {
      case "create_defaults":
        const tasks = await createDefaultOnboardingTasks(
          adminClient,
          storeId,
          isAdmin ? user.id : undefined
        );
        return NextResponse.json({ tasks });

      case "complete_task":
        if (!taskKey) {
          return NextResponse.json(
            { error: "taskKey required" },
            { status: 400 }
          );
        }
        await completeOnboardingTask(adminClient, storeId, taskKey);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
