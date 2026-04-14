import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import {
  sanitizeSubdomain,
  validateSubdomain,
  isSubdomainTaken,
} from "@/lib/stores/subdomain";

export async function PUT(
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subdomain: rawSubdomain } = await request.json();
    const subdomain = sanitizeSubdomain(rawSubdomain || "");

    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const taken = await isSubdomainTaken(
      createAdminClient(),
      subdomain,
      params.id
    );
    if (taken) {
      return NextResponse.json(
        { error: `Subdomain "${subdomain}" is already taken` },
        { status: 409 }
      );
    }

    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("stores")
      .update({ subdomain })
      .eq("id", params.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update subdomain" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subdomain });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
