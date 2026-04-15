import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const storeId = params.id;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const { data: discount, error } = await supabase
      .from("discounts")
      .select("*")
      .eq("store_id", storeId)
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !discount) {
      return NextResponse.json({ valid: false, error: "Invalid or inactive discount code" });
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This discount code has expired" });
    }

    // Check usage limits
    if (discount.max_uses && discount.uses_count >= discount.max_uses) {
      return NextResponse.json({ valid: false, error: "This discount code has reached its usage limit" });
    }

    // Check starts_at
    if (discount.starts_at && new Date(discount.starts_at) > new Date()) {
      return NextResponse.json({ valid: false, error: "This discount code is not yet active" });
    }

    return NextResponse.json({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        min_order_amount: discount.min_order_amount,
      }
    });
  } catch (err: any) {
    console.error(`[HEADLESS DISCOUNT VALIDATION ERROR]`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
