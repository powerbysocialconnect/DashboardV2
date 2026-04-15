-- 024_store_images_storage_rls.sql
-- Merchant logo uploads: bucket "store-images", paths {store_id}/filename.ext
--
-- IMPORTANT: Policies must NOT use raw "EXISTS (SELECT ... FROM stores)" because
-- that subquery runs with the caller's RLS on public.stores. If stores has no
-- SELECT for that user (or stricter policies), uploads fail with:
--   StorageApiError: new row violates row-level security policy
--
-- We use SECURITY DEFINER helpers (search_path pinned) to verify ownership safely.
--
-- Apply in Supabase SQL Editor (idempotent — safe to re-run).

-- 0. Helpers (bypass stores/profiles RLS only inside these controlled checks)
CREATE OR REPLACE FUNCTION public.store_image_path_owned_by_me(object_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id::text = split_part(COALESCE(object_name, ''), '/', 1)
      AND s.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.store_image_path_owned_by_me(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_image_path_owned_by_me(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_platform_admin() TO authenticated;

-- 1. Bucket (public so storefront can load logos via public URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Drop policies (re-run safe)
DROP POLICY IF EXISTS "Store images public read" ON storage.objects;
DROP POLICY IF EXISTS "Store owners upload store images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update store images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners delete store images" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert store images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update store images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete store images" ON storage.objects;

-- 3. Policies
CREATE POLICY "Store images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-images');

CREATE POLICY "Store owners upload store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images'
  AND public.store_image_path_owned_by_me(name)
);

CREATE POLICY "Store owners update store images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images'
  AND public.store_image_path_owned_by_me(name)
)
WITH CHECK (
  bucket_id = 'store-images'
  AND public.store_image_path_owned_by_me(name)
);

CREATE POLICY "Store owners delete store images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images'
  AND public.store_image_path_owned_by_me(name)
);

CREATE POLICY "Admins insert store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images'
  AND public.current_user_is_platform_admin()
);

CREATE POLICY "Admins update store images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images'
  AND public.current_user_is_platform_admin()
)
WITH CHECK (
  bucket_id = 'store-images'
  AND public.current_user_is_platform_admin()
);

CREATE POLICY "Admins delete store images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images'
  AND public.current_user_is_platform_admin()
);
