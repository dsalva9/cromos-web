-- Migration: Ensure profiles auto-create for auth users
-- Context: Sprint 10 Social UI - test 1.4 regression fix
-- Purpose: Backfill missing profile rows and add trigger to create them on signup
-- Date: 2025-10-23

BEGIN;

-- Backfill any auth users that do not yet have a profile row
INSERT INTO public.profiles (id, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure any previous implementation is replaced cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Create trigger function to auto-create profile rows for new auth users
CREATE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE
    SET updated_at = COALESCE(NEW.updated_at, NOW());

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users to run after every new signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
