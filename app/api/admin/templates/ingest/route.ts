import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import crypto from "crypto";
import {
  createAdminClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import {
  MAX_ENTRY_COUNT,
  MAX_SINGLE_FILE_BYTES,
  MAX_ZIP_BYTES,
  REQUIRED_FILES,
  isPathTraversal,
  normalizeZipEntryPath,
  validateThemePackageDocuments,
} from "@/lib/themes/packageContract";

async function requireAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, userId: user.id };
}

function parseJsonFile(zip: AdmZip, name: string): unknown {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`Missing required file: ${name}`);
  return JSON.parse(entry.getData().toString("utf-8"));
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get("themePackage");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "themePackage file is required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip packages are supported" }, { status: 400 });
    }
    if (file.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: `Zip exceeds ${MAX_ZIP_BYTES / (1024 * 1024)}MB` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const packageHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    if (entries.length > MAX_ENTRY_COUNT) {
      return NextResponse.json({ error: "Zip has too many files" }, { status: 400 });
    }

    const normalizedEntries = entries.map((entry) => ({
      entry,
      name: normalizeZipEntryPath(entry.entryName),
      size: entry.header.size,
    }));

    for (const { name, size } of normalizedEntries) {
      if (isPathTraversal(name)) {
        return NextResponse.json({ error: `Unsafe entry path blocked: ${name}` }, { status: 400 });
      }
      if (size > MAX_SINGLE_FILE_BYTES) {
        return NextResponse.json({ error: `File too large in zip: ${name}` }, { status: 400 });
      }
    }

    for (const required of REQUIRED_FILES) {
      const exists = normalizedEntries.some((e) => e.name === required);
      if (!exists) {
        return NextResponse.json({ error: `Missing required file: ${required}` }, { status: 400 });
      }
    }

    const themeJson = parseJsonFile(zip, "theme.json");
    const schemaJson = parseJsonFile(zip, "schema.json");
    const blueprintExists = normalizedEntries.some((e) => e.name === "blueprint.json");
    const blueprintJson = blueprintExists ? parseJsonFile(zip, "blueprint.json") : undefined;
    const validated = validateThemePackageDocuments({
      themeJson,
      schemaJson,
      blueprintJson,
    });

    const adminClient = createAdminClient();
    const { metadata, schema, blueprint } = validated;

    try {
      const { data: existingVersion } = await adminClient
        .from("headless_template_versions")
        .select("id")
        .eq("package_hash", packageHash)
        .maybeSingle();

      if (existingVersion?.id) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "Identical package already ingested",
          metadata,
        });
      }
    } catch {
      // Versions table may not exist yet before migration 028 is applied.
    }

    const basePath = `theme-packages/${metadata.themeCode}/${metadata.version}`;
    const bundleJs = zip.getEntry("bundle.js")?.getData();
    const bundleCss = zip.getEntry("bundle.css")?.getData();
    if (!bundleJs || !bundleCss) {
      return NextResponse.json({ error: "bundle.js and bundle.css are required" }, { status: 400 });
    }

    const uploadFile = async (
      path: string,
      body: Buffer,
      contentType: string
    ): Promise<string> => {
      const { error } = await adminClient.storage
        .from("template-assets")
        .upload(path, body, {
          upsert: true,
          contentType,
        });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = adminClient.storage.from("template-assets").getPublicUrl(path);
      return publicUrl;
    };

    const bundleUrl = await uploadFile(
      `${basePath}/bundle.js`,
      bundleJs,
      "application/javascript"
    );
    const styleUrl = await uploadFile(
      `${basePath}/bundle.css`,
      bundleCss,
      "text/css"
    );

    let previewUrl: string | null = null;
    const previewEntry = normalizedEntries.find((e) =>
      /^(preview\.(png|jpg|jpeg|webp))$/i.test(e.name)
    );
    if (previewEntry) {
      previewUrl = await uploadFile(
        `${basePath}/${previewEntry.name}`,
        previewEntry.entry.getData(),
        previewEntry.name.endsWith(".png")
          ? "image/png"
          : previewEntry.name.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg"
      );
    }

    const assetEntries = normalizedEntries.filter((e) => e.name.startsWith("assets/"));
    const assetUrls: string[] = [];
    for (const asset of assetEntries) {
      const contentType =
        asset.name.endsWith(".svg")
          ? "image/svg+xml"
          : asset.name.endsWith(".png")
          ? "image/png"
          : asset.name.endsWith(".webp")
          ? "image/webp"
          : asset.name.endsWith(".jpg") || asset.name.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
      const url = await uploadFile(
        `${basePath}/${asset.name}`,
        asset.entry.getData(),
        contentType
      );
      assetUrls.push(url);
    }

    return NextResponse.json({
      success: true,
      duplicate: false,
      metadata,
      schema,
      blueprint,
      assets: {
        bundleUrl,
        styleUrl,
        previewUrl,
        assetUrls,
      },
      packageHash,
      packageFiles: normalizedEntries.map((e) => e.name),
    });
  } catch (error) {
    console.error("[theme-ingest POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
