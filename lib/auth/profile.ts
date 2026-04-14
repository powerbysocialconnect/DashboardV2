import { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile, Store } from "@/types/database";

/**
 * Unified profile resolution layer.
 *
 * Every authenticated Supabase Auth user must map to exactly one `profiles` row.
 * These helpers guarantee that mapping exists, and provide ownership guards
 * that all dashboard and API code can rely on.
 *
 * Backward compatibility:
 * - The `profiles` table is not modified — only read/upserted into.
 * - Existing profile rows are never overwritten (ON CONFLICT DO NOTHING / DO UPDATE only on missing fields).
 * - `stores.owner_id` continues to reference `profiles.id`.
 */

// ─── upsertProfileFromAuthUser ─────────────────────────────────────────────
/**
 * Given a Supabase Auth user object, ensure a corresponding `profiles` row exists.
 *
 * If the row already exists, it is returned as-is (no fields are overwritten).
 * If it doesn't exist, a new row is inserted using data from the auth user.
 *
 * Uses the service-role client so RLS doesn't block the upsert.
 * Falls back gracefully if the upsert fails (returns null + logs).
 */
export async function upsertProfileFromAuthUser(
  supabase: SupabaseClient,
  authUser: User
): Promise<Profile | null> {
  const meta = authUser.user_metadata || {};

  const profileData = {
    id: authUser.id,
    email: authUser.email || "",
    full_name: meta.full_name || meta.name || null,
    avatar_url: meta.avatar_url || null,
    is_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try insert first. If the row exists, do nothing — preserving existing data.
  const { error: insertError } = await supabase
    .from("profiles")
    .upsert(profileData, { onConflict: "id", ignoreDuplicates: true });

  if (insertError) {
    console.error(
      `[auth/profile] Failed to upsert profile for user ${authUser.id}:`,
      insertError.message
    );
  }

  // Always fetch the canonical row (whether just-created or pre-existing)
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (fetchError || !profile) {
    console.error(
      `[auth/profile] Could not fetch profile for user ${authUser.id}:`,
      fetchError?.message
    );
    return null;
  }

  return profile as Profile;
}

// ─── getCurrentUserProfile ─────────────────────────────────────────────────
/**
 * Resolve the current authenticated user to a `profiles` row.
 *
 * 1. Call `supabase.auth.getUser()` to get the authenticated user
 * 2. Fetch the corresponding `profiles` row
 * 3. If missing, auto-create via `upsertProfileFromAuthUser()`
 * 4. Return the profile, or null if not authenticated
 *
 * This is the single entry point that all server-side code should use
 * instead of raw `auth.getUser()` + manual profile fetch.
 */
export async function getCurrentUserProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  // Fast path: profile already exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) return profile as Profile;

  // Slow path: profile missing — create it from the auth user.
  // This handles edge cases where the trigger hasn't fired yet
  // or the user was created before the trigger existed.
  console.warn(
    `[auth/profile] Profile missing for authenticated user ${user.id} (${user.email}). Creating...`
  );
  return upsertProfileFromAuthUser(supabase, user);
}

// ─── getUserStore ──────────────────────────────────────────────────────────
/**
 * Find the store owned by the current authenticated user.
 *
 * Returns the most recently created store for the user,
 * or null if the user has no stores.
 */
export async function getUserStore(
  supabase: SupabaseClient
): Promise<{ profile: Profile; store: Store } | null> {
  const profile = await getCurrentUserProfile(supabase);
  if (!profile) return null;

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!store) return null;

  return { profile, store: store as Store };
}

// ─── requireOwnedStore ─────────────────────────────────────────────────────
/**
 * Server-side guard: verify the current authenticated user owns a specific store.
 *
 * Throws a descriptive error if:
 * - User is not authenticated
 * - User has no profile
 * - Store doesn't exist
 * - User doesn't own the store (and is not an admin)
 *
 * Returns the verified { profile, store } on success.
 */
export async function requireOwnedStore(
  supabase: SupabaseClient,
  storeId: string
): Promise<{ profile: Profile; store: Store }> {
  const profile = await getCurrentUserProfile(supabase);
  if (!profile) {
    throw new Error("Unauthorized: not authenticated");
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error || !store) {
    throw new Error("Store not found");
  }

  const typedStore = store as Store;

  // Allow if user owns the store OR is a platform admin
  if (typedStore.owner_id !== profile.id && !profile.is_admin) {
    throw new Error("Forbidden: you do not own this store");
  }

  return { profile, store: typedStore };
}

// ─── requireAuthenticatedProfile ───────────────────────────────────────────
/**
 * Convenience guard: ensures the user is authenticated and has a profile.
 * Throws if not. Used for API routes that need a profile but not necessarily a store.
 */
export async function requireAuthenticatedProfile(
  supabase: SupabaseClient
): Promise<Profile> {
  const profile = await getCurrentUserProfile(supabase);
  if (!profile) {
    throw new Error("Unauthorized: not authenticated");
  }
  return profile;
}
