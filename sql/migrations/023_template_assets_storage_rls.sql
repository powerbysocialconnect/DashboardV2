-- 023_template_assets_storage_rls.sql
-- Set up storage bucket and RLS policies for template assets

-- 1. Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-assets', 'template-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
-- Note: storage.objects usually has RLS enabled by default in Supabase

-- 3. Delete existing policies for this bucket to avoid conflicts (optional but safer for "fixing")
DROP POLICY IF EXISTS "Template Assets Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload template assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update template assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete template assets" ON storage.objects;

-- 4. Create policies

-- Policy: Anyone can view objects in template-assets (since it's a public bucket, but RLS adds extra security)
CREATE POLICY "Template Assets Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-assets');

-- Policy: Only admins can upload objects
CREATE POLICY "Admins can upload template assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'template-assets' AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
);

-- Policy: Only admins can update objects
CREATE POLICY "Admins can update template assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'template-assets' AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
)
WITH CHECK (
  bucket_id = 'template-assets' AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
);

-- Policy: Only admins can delete objects
CREATE POLICY "Admins can delete template assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'template-assets' AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
);
