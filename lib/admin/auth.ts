import { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { getCurrentUserProfile } from "@/lib/auth/profile";

/**
 * Admin auth helpers.
 *
 * These now delegate to the unified profile resolution layer in lib/auth/profile.ts
 * so that every auth check benefits from auto-upsert of missing profiles.
 *
 * All existing call sites (checkIsAdmin, requireAdmin, getCurrentUser) continue
 * to work with identical signatures and return types.
 */

export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  const profile = await getCurrentUserProfile(supabase);
  return profile?.is_admin === true;
}

export async function requireAdmin(supabase: SupabaseClient): Promise<Profile> {
  const profile = await getCurrentUserProfile(supabase);
  if (!profile || !profile.is_admin) {
    throw new Error("Unauthorized: admin access required");
  }
  return profile;
}

/**
 * Get the current authenticated user's profile.
 * Now backed by getCurrentUserProfile which auto-creates missing profiles.
 *
 * @deprecated Prefer importing getCurrentUserProfile from lib/auth/profile directly.
 */
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<Profile | null> {
  return getCurrentUserProfile(supabase);
}
