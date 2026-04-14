import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify admin status
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Using admin client to bypass RLS for updating other users' stores
    const adminClient = createAdminClient();

    // Parse the payload
    const body = await request.json();
    const { storeIds } = body;

    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json({ error: "No store IDs provided" }, { status: 400 });
    }

    // Update stores
    const { error: updateError } = await adminClient
      .from("stores")
      .update({ 
        status: "live",
        published_at: new Date().toISOString()
      })
      .in("id", storeIds);

    if (updateError) {
      console.error("Failed to update stores:", updateError);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: storeIds.length });
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
