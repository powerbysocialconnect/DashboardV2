import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import {
  sanitizeSubdomain,
  validateSubdomain,
  isSubdomainTaken,
} from "@/lib/stores/subdomain";

/**
 * Merchant endpoint for updating their own store's subdomain.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subdomain: rawSubdomain } = await request.json();
    const subdomain = sanitizeSubdomain(rawSubdomain || "");

    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Resolve the merchant's store
    const adminClient = createAdminClient();
    const { data: store } = await adminClient
      .from("stores")
      .select("id, status")
      .eq("owner_id", user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const taken = await isSubdomainTaken(adminClient, subdomain, store.id);
    if (taken) {
      return NextResponse.json(
        { error: `Subdomain "${subdomain}" is already taken` },
        { status: 409 }
      );
    }

    const { error: updateError } = await adminClient
      .from("stores")
      .update({ subdomain })
      .eq("id", store.id);

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
