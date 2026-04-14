import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/stores/[id]/section-overrides/upload
 * Upload an image for a section field to Supabase Storage.
 *
 * Form data:
 * - file: File
 * - sectionType: string
 * - fieldId: string
 *
 * Returns: { url: string }
 */
export async function POST(
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

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storeId = params.id;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sectionType = formData.get("sectionType") as string;
    const fieldId = formData.get("fieldId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!sectionType || !fieldId) {
      return NextResponse.json(
        { error: "sectionType and fieldId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File too large. Maximum 10MB. Got ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    // Generate storage path
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const storagePath = `sections/${storeId}/${sectionType}/${fieldId}_${timestamp}.${ext}`;

    const adminClient = createAdminClient();

    // Upload to Supabase Storage (template-assets bucket)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("template-assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("template-assets")
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file");
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: storagePath,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Section image upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
