-- Fix critical admin panel issues
-- 1. Add missing admin_nickname column to audit_log
-- 2. Update audit_log entity check constraint to include 'user'
-- 3. Fix sticker ID generation in admin_upsert_sticker

-- 1. Add admin_nickname column to audit_log table
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS admin_nickname TEXT;

-- Update existing audit log entries to populate admin_nickname from user_id
UPDATE audit_log
SET admin_nickname = (SELECT nickname FROM profiles WHERE id = audit_log.user_id)
WHERE admin_nickname IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_nickname ON audit_log(admin_nickname);

-- 2. Update audit_log entity check constraint to include 'user' entity type
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_entity_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_entity_check
  CHECK (entity IN ('collection', 'page', 'sticker', 'image', 'user'));

-- 3. Fix admin_upsert_sticker to properly handle ID generation
DROP FUNCTION IF EXISTS admin_upsert_sticker(JSONB);

CREATE OR REPLACE FUNCTION admin_upsert_sticker(p_sticker JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_sticker_id BIGINT;
  v_before_json JSONB;
  v_after_json JSONB;
  v_current_user_id UUID;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Extract ID (can be null for new stickers)
  v_sticker_id := (p_sticker->>'id')::BIGINT;

  -- Capture before state if updating
  IF v_sticker_id IS NOT NULL THEN
    SELECT to_jsonb(s.*) INTO v_before_json
    FROM stickers s
    WHERE s.id = v_sticker_id;
  END IF;

  -- Upsert sticker (do not include id in INSERT column list if it's NULL - let DB generate it)
  IF v_sticker_id IS NULL THEN
    -- Create new sticker (let DB auto-generate id)
    INSERT INTO stickers (
      collection_id,
      team_id,
      code,
      player_name,
      position,
      nationality,
      rating,
      rarity,
      image_url,
      sticker_number,
      image_path_webp_300,
      thumb_path_webp_100
    )
    VALUES (
      (p_sticker->>'collection_id')::INTEGER,
      (p_sticker->>'team_id')::INTEGER,
      p_sticker->>'code',
      p_sticker->>'player_name',
      p_sticker->>'position',
      p_sticker->>'nationality',
      (p_sticker->>'rating')::INTEGER,
      p_sticker->>'rarity',
      p_sticker->>'image_url',
      (p_sticker->>'sticker_number')::INTEGER,
      p_sticker->>'image_path_webp_300',
      p_sticker->>'thumb_path_webp_100'
    )
    RETURNING id INTO v_sticker_id;
  ELSE
    -- Update existing sticker
    UPDATE stickers SET
      collection_id = (p_sticker->>'collection_id')::INTEGER,
      team_id = (p_sticker->>'team_id')::INTEGER,
      code = p_sticker->>'code',
      player_name = p_sticker->>'player_name',
      position = p_sticker->>'position',
      nationality = p_sticker->>'nationality',
      rating = (p_sticker->>'rating')::INTEGER,
      rarity = p_sticker->>'rarity',
      image_url = p_sticker->>'image_url',
      sticker_number = (p_sticker->>'sticker_number')::INTEGER,
      image_path_webp_300 = p_sticker->>'image_path_webp_300',
      thumb_path_webp_100 = p_sticker->>'thumb_path_webp_100',
      updated_at = NOW()
    WHERE id = v_sticker_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cromo no encontrado: %', v_sticker_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Capture after state
  SELECT to_jsonb(s.*) INTO v_after_json
  FROM stickers s
  WHERE s.id = v_sticker_id;

  -- Audit log
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'sticker',
    v_sticker_id,
    CASE WHEN v_before_json IS NULL THEN 'create' ELSE 'update' END,
    v_before_json,
    v_after_json;

  RETURN v_sticker_id;
END;
$$;
