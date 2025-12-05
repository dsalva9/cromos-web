-- Migration: Fix handle_new_auth_user to satisfy profile constraints
-- Reason: Signups were failing with 500 due to CHECK constraints on profiles.nickname/postcode
-- This version pulls nickname/postcode from raw_user_meta_data and falls back to safe placeholders

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
  -- Prefer client-supplied metadata
  v_nickname := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'nickname', '')), '');
  v_postcode := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'postcode', '')), '');

  -- Fallbacks to satisfy CHECK constraints (nickname cannot be blank or 'sin nombre')
  IF v_nickname IS NULL OR lower(trim(v_nickname)) = 'sin nombre' THEN
    v_nickname := 'pending_' || substring(NEW.id::text, 1, 8);
  END IF;

  IF v_postcode IS NULL THEN
    v_postcode := 'PENDING';
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
  'Creates/updates profile on signup with safe nickname/postcode defaults to satisfy constraints.';
