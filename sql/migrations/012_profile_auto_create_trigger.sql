-- Additive migration: auto-create a profiles row whenever a new Supabase Auth user is created.
-- This ensures every authenticated user always has a corresponding profiles row,
-- preventing null-profile scenarios throughout the app.
--
-- SAFE: Uses CREATE OR REPLACE and IF NOT EXISTS — idempotent and non-destructive.
-- Existing profiles rows are untouched (INSERT ... ON CONFLICT DO NOTHING).

-- 1. Trigger function: map auth.users fields → profiles row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    NEW.raw_user_meta_data ->> 'avatar_url',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END;
$$;

-- 3. Backfill: create profiles rows for any existing auth users that are missing one.
--    This covers users who signed up before this trigger existed.
INSERT INTO public.profiles (id, email, full_name, is_admin, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', ''),
  false,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
