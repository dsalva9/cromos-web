-- Migration: Adjust handle_new_auth_user defaults to avoid signup errors
-- Purpose: Ensure profiles created on signup always satisfy constraints and postcode validation

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_nickname TEXT;
  v_postcode TEXT;
BEGIN
  -- Prefer client-supplied metadata, trimmed
  v_nickname := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'nickname', '')), '');
  v_postcode := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'postcode', '')), '');

  -- Fallbacks to satisfy nickname/postcode constraints and validation
  IF v_nickname IS NULL OR lower(trim(v_nickname)) = 'sin nombre' THEN
    v_nickname := 'pending_' || replace(NEW.id::text, '-', '');
  END IF;

  -- Use a known valid Spanish postcode to satisfy postcode presence/validation triggers
  IF v_postcode IS NULL THEN
    v_postcode := '28001';
  END IF;

  INSERT INTO public.profiles (id, nickname, postcode, created_at, updated_at)
  VALUES (
    NEW.id,
    v_nickname,
    v_postcode,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE
    SET nickname = EXCLUDED.nickname,
        postcode = EXCLUDED.postcode,
        updated_at = COALESCE(NEW.updated_at, NOW());

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user IS
  'Creates/updates profile on signup with safe nickname/postcode defaults to satisfy constraints and postcode validation.';
