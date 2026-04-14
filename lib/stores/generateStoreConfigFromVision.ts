import { SupabaseClient } from "@supabase/supabase-js";
import type {
  VisionForm,
  ThemeSettings,
  HomepageSection,
  ThemeCode,
} from "@/types/database";
import { logStoreAction } from "@/lib/admin/logStoreAction";
import {
  generateUniqueSubdomain,
  sanitizeSubdomain,
  validateSubdomain,
  isSubdomainTaken,
} from "@/lib/stores/subdomain";

function inferThemeCode(brandStyle: string | null): ThemeCode {
  if (!brandStyle) return "starter";
  const style = brandStyle.toLowerCase();
  if (style.includes("pro") || style.includes("premium") || style.includes("professional")) {
    return "pro";
  }
  if (style.includes("modern") || style.includes("professional") || style.includes("bold")) {
    return "premium";
  }
  return "starter";
}

function buildThemeSettings(vision: VisionForm): ThemeSettings {
  return {
    primaryColor: "#111111",
    accentColor: "#D4AF37",
    backgroundColor: "#FFFFFF",
    headingFont: "Inter",
    bodyFont: "Inter",
    buttonStyle: "rounded",
    logoAlignment: "left",
  };
}

function buildHomepageLayout(vision: VisionForm): HomepageSection[] {
  const sections: HomepageSection[] = [];

  sections.push({
    type: "hero",
    variant: "centered",
    title: vision.brand_name || "Welcome",
    subtitle: vision.business_description || "Discover our products",
    ctaLabel: "Shop Now",
    ctaUrl: "/products",
  });

  sections.push({
    type: "featured_products",
    title: "Featured Products",
    limit: 8,
  });

  if (vision.business_description) {
    sections.push({
      type: "image_with_text",
      title: "Our Story",
      body: vision.business_description,
      imageUrl: vision.logo_url || "",
    });
  }

  sections.push({
    type: "newsletter",
    title: "Stay Updated",
    subtitle: `Subscribe to ${vision.brand_name || "our"} newsletter`,
  });

  return sections;
}

export async function generateStoreConfigFromVision(
  supabase: SupabaseClient,
  visionFormId: string,
  adminUserId: string
): Promise<{ storeId: string; themeConfigId: string }> {
  const { data: vision, error: visionError } = await supabase
    .from("vision_forms")
    .select("*")
    .eq("id", visionFormId)
    .single();

  if (visionError || !vision) {
    throw new Error("Vision form not found");
  }

  // Find or create the store
  let storeId: string;

  // Check if this user already has a store with a matching subdomain
  const candidateSlug = vision.subdomain
    ? sanitizeSubdomain(vision.subdomain)
    : sanitizeSubdomain(vision.brand_name || "");

  const { data: existingStore } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", vision.user_id)
    .or(candidateSlug ? `subdomain.eq.${candidateSlug}` : "id.is.null")
    .single();

  if (existingStore) {
    storeId = existingStore.id;
    await supabase
      .from("stores")
      .update({
        name: vision.brand_name,
        status: "building",
        logo_url: vision.logo_url,
      })
      .eq("id", storeId);
  } else {
    // Generate a unique, validated subdomain from the vision form data
    let subdomain: string;

    if (vision.subdomain) {
      const sanitized = sanitizeSubdomain(vision.subdomain);
      const error = validateSubdomain(sanitized);
      if (error) {
        // Supplied subdomain is invalid — auto-generate instead
        subdomain = await generateUniqueSubdomain(supabase, vision.brand_name || "store");
      } else {
        const taken = await isSubdomainTaken(supabase, sanitized);
        subdomain = taken
          ? await generateUniqueSubdomain(supabase, vision.brand_name || "store")
          : sanitized;
      }
    } else {
      subdomain = await generateUniqueSubdomain(
        supabase,
        vision.brand_name || "store"
      );
    }

    const { data: newStore, error: createError } = await supabase
      .from("stores")
      .insert({
        owner_id: vision.user_id,
        name: vision.brand_name,
        subdomain,
        status: "building",
        logo_url: vision.logo_url,
      })
      .select("id")
      .single();

    if (createError || !newStore) {
      throw new Error("Failed to create store");
    }
    storeId = newStore.id;
  }

  // Create or update theme config
  const themeCode = inferThemeCode(vision.brand_style);
  const themeSettings = buildThemeSettings(vision);
  const homepageLayout = buildHomepageLayout(vision);

  const { data: existingConfig } = await supabase
    .from("store_theme_configs")
    .select("id")
    .eq("store_id", storeId)
    .single();

  let themeConfigId: string;

  if (existingConfig) {
    await supabase
      .from("store_theme_configs")
      .update({
        theme_code: themeCode,
        theme_settings: themeSettings,
        homepage_layout: homepageLayout,
      })
      .eq("id", existingConfig.id);
    themeConfigId = existingConfig.id;
  } else {
    const { data: newConfig, error: configError } = await supabase
      .from("store_theme_configs")
      .insert({
        store_id: storeId,
        theme_code: themeCode,
        theme_settings: themeSettings,
        homepage_layout: homepageLayout,
      })
      .select("id")
      .single();

    if (configError || !newConfig) {
      throw new Error("Failed to create theme config");
    }
    themeConfigId = newConfig.id;
  }

  // Update vision form status
  await supabase
    .from("vision_forms")
    .update({ status: "building" })
    .eq("id", visionFormId);

  // Create provisioning job
  await supabase.from("store_provisioning_jobs").insert({
    store_id: storeId,
    job_type: "generate_from_vision",
    status: "completed",
    payload: { vision_form_id: visionFormId },
    result: { theme_config_id: themeConfigId },
  });

  await logStoreAction(supabase, {
    store_id: storeId,
    action: "store_config_generated_from_vision",
    details: { vision_form_id: visionFormId, theme_code: themeCode },
    performed_by: adminUserId,
  });

  return { storeId, themeConfigId };
}
