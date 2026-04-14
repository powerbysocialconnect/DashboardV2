import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/profiles
 * List all user profiles for administration.
 * Admins only.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const adminClient = createAdminClient();

  // 1. Verify admin status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  // 2. Fetch all profiles using adminClient to bypass any restrictive RLS
  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, email, full_name, subscription_plan")
    .order("email", { ascending: true });

  if (error) {
    console.error("[admin-profiles] Fetch error:", error.message);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  return NextResponse.json(profiles);
}
