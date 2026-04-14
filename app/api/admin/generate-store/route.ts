import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { generateStoreConfigFromVision } from "@/lib/stores/generateStoreConfigFromVision";
import { createDefaultOnboardingTasks } from "@/lib/stores/onboarding";

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

    const { visionFormId } = await request.json();

    if (!visionFormId) {
      return NextResponse.json(
        { error: "visionFormId is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const result = await generateStoreConfigFromVision(
      adminClient,
      visionFormId,
      user.id
    );

    await createDefaultOnboardingTasks(adminClient, result.storeId, user.id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
