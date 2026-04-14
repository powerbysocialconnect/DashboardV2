import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user (security check)
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the file from request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 3. Prepare for upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`; // Organized by user ID

    // 4. Use Admin Client to bypass RLS
    const adminSupabase = createAdminClient();
    
    const { data, error: uploadError } = await adminSupabase.storage
      .from("products")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from("products")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });

  } catch (err: any) {
    console.error("Internal upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
