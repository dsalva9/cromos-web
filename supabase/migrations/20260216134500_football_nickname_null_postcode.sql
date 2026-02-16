-- Migration: Replace pending_<uuid> nicknames with football-themed random combos
-- and change default postcode from '28001' to NULL to force profile completion.
--
-- SAFETY: This only affects NEW signups. Existing profiles are untouched.

CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_nickname TEXT;
  v_postcode TEXT;
  v_prefix TEXT;
  v_suffix TEXT;
BEGIN
  -- Prefer client-supplied metadata, trimmed
  v_nickname := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'nickname', '')), '');
  v_postcode := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'postcode', '')), '');

  -- Generate a football-themed random nickname if none supplied
  IF v_nickname IS NULL OR lower(trim(v_nickname)) = 'sin nombre' THEN
    -- Pick a random prefix (football-themed)
    v_prefix := (ARRAY[
      'Gol', 'Crack', 'Balon', 'Liga', 'Regate',
      'Chilena', 'Volea', 'Tiki', 'Copa', 'Fuera',
      'Once', 'Pichichi'
    ])[floor(random() * 12 + 1)::int];

    -- Pick a random suffix (animal/character-themed)
    v_suffix := (ARRAY[
      'Tigre', 'Leon', 'Halcon', 'Dragon', 'Fenix',
      'Rayo', 'Titan', 'Ninja', 'Gato', 'Lobo',
      'Panda', 'Toro'
    ])[floor(random() * 12 + 1)::int];

    -- Combine: prefix + suffix + 2-digit number (e.g. GolTigre42)
    v_nickname := v_prefix || v_suffix || lpad(floor(random() * 100)::text, 2, '0');
  END IF;

  -- Default postcode to NULL (forces profile completion)
  -- Previously defaulted to '28001' which allowed skipping the postcode step
  -- NULL is safe: column is nullable, CHECK constraint allows NULL,
  -- and validate_profile_postcode trigger skips NULL values.

  INSERT INTO public.profiles (id, nickname, postcode, created_at, updated_at)
  VALUES (
    NEW.id,
    v_nickname,
    v_postcode,  -- NULL if not provided (no longer defaults to '28001')
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

COMMENT ON FUNCTION "public"."handle_new_auth_user"() IS 'Creates/updates profile on signup with football-themed random nickname and NULL postcode to force profile completion.';
