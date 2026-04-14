import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/dashboard/stores/[id]/connect-stripe/refresh
 * Handles cases where the account link has expired or reached some limit.
 * Simply redirects the user back to the settings page where they can click "Connect" again.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.redirect(new URL("/dashboard/settings?stripe=refresh", request.nextUrl.origin));
}
