import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sanitizeSubdomain,
  validateSubdomain,
  isSubdomainTaken,
} from "@/lib/stores/subdomain";

/**
 * Public validation endpoint for checking subdomain availability.
 * GET /api/subdomain/validate?subdomain=mystore&excludeStoreId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get("subdomain") || "";
  const excludeStoreId = searchParams.get("excludeStoreId") || undefined;

  const sanitized = sanitizeSubdomain(raw);

  const validationError = validateSubdomain(sanitized);
  if (validationError) {
    return NextResponse.json({
      available: false,
      sanitized,
      error: validationError,
    });
  }

  const adminClient = createAdminClient();
  const taken = await isSubdomainTaken(adminClient, sanitized, excludeStoreId);

  return NextResponse.json({
    available: !taken,
    sanitized,
    error: taken ? `"${sanitized}" is already taken` : null,
  });
}
