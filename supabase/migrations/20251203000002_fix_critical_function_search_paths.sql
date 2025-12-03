-- Fix search_path security issue for critical authentication and authorization functions
-- Setting search_path prevents function hijacking attacks
-- Priority: Functions that deal with authentication, authorization, and security

-- Fix handle_new_auth_user (critical - runs on user signup)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'Sin nombre'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Fix is_admin_user (critical - authorization check)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Fix require_admin (critical - authorization enforcement)
CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions. Admin access required.';
  END IF;
END;
$$;

-- Fix check_self_report (critical - prevents users from reporting themselves)
CREATE OR REPLACE FUNCTION public.check_self_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Prevent users from reporting themselves
  IF NEW.reporter_id = (
    CASE
      WHEN NEW.target_type = 'user' THEN NEW.target_id::uuid
      WHEN NEW.target_type = 'listing' THEN (SELECT user_id FROM trade_listings WHERE id = NEW.target_id)
      WHEN NEW.target_type = 'template' THEN (SELECT author_id FROM collection_templates WHERE id = NEW.target_id)
      WHEN NEW.target_type = 'rating' THEN (SELECT rated_id FROM user_ratings WHERE id = NEW.target_id)
      ELSE NULL
    END
  ) THEN
    RAISE EXCEPTION 'You cannot report your own content';
  END IF;

  RETURN NEW;
END;
$$;

-- Fix prevent_messaging_ignored_users (critical - prevents harassment)
CREATE OR REPLACE FUNCTION public.prevent_messaging_ignored_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if sender is ignored by receiver or vice versa
  IF EXISTS (
    SELECT 1 FROM ignored_users
    WHERE (user_id = NEW.receiver_id AND ignored_user_id = NEW.sender_id)
    OR (user_id = NEW.sender_id AND ignored_user_id = NEW.receiver_id)
  ) THEN
    RAISE EXCEPTION 'Cannot send message: user relationship blocked';
  END IF;

  RETURN NEW;
END;
$$;

-- Fix validate_profile_postcode (critical - data validation)
CREATE OR REPLACE FUNCTION public.validate_profile_postcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If postcode is provided, validate it exists in postal_codes table
  IF NEW.postcode IS NOT NULL AND TRIM(NEW.postcode) <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM postal_codes
      WHERE postcode = NEW.postcode
      AND country = 'ES' -- Assuming Spain, adjust if needed
    ) THEN
      RAISE EXCEPTION 'Invalid postcode: % not found in database', NEW.postcode;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user IS 'Trigger function to auto-create profile on user signup. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.is_admin_user IS 'Checks if current user is an admin. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.require_admin IS 'Throws exception if current user is not an admin. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.check_self_report IS 'Prevents users from reporting their own content. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.prevent_messaging_ignored_users IS 'Prevents messaging between blocked users. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.validate_profile_postcode IS 'Validates postcode against postal_codes table. SECURITY DEFINER with search_path set.';
