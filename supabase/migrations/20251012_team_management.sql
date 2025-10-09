-- Team management RPCs for admin panel
-- Allows admins to create, update, and delete teams for collections

-- 1. Admin upsert team (create or update)
CREATE OR REPLACE FUNCTION admin_upsert_team(p_team JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_team_id INTEGER;
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

  -- Extract ID (can be null for new teams)
  v_team_id := (p_team->>'id')::INTEGER;

  -- Capture before state if updating
  IF v_team_id IS NOT NULL THEN
    SELECT to_jsonb(t.*) INTO v_before_json
    FROM collection_teams t
    WHERE t.id = v_team_id;
  END IF;

  -- Upsert team
  IF v_team_id IS NULL THEN
    -- Create new team (let DB auto-generate id)
    INSERT INTO collection_teams (
      collection_id,
      team_name,
      flag_url,
      primary_color,
      secondary_color
    )
    VALUES (
      (p_team->>'collection_id')::INTEGER,
      p_team->>'team_name',
      p_team->>'flag_url',
      p_team->>'primary_color',
      p_team->>'secondary_color'
    )
    RETURNING id INTO v_team_id;
  ELSE
    -- Update existing team
    UPDATE collection_teams SET
      collection_id = (p_team->>'collection_id')::INTEGER,
      team_name = p_team->>'team_name',
      flag_url = p_team->>'flag_url',
      primary_color = p_team->>'primary_color',
      secondary_color = p_team->>'secondary_color',
      updated_at = NOW()
    WHERE id = v_team_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Equipo no encontrado: %', v_team_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Capture after state
  SELECT to_jsonb(t.*) INTO v_after_json
  FROM collection_teams t
  WHERE t.id = v_team_id;

  -- Audit log
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'team',
    v_team_id,
    CASE WHEN v_before_json IS NULL THEN 'create' ELSE 'update' END,
    v_before_json,
    v_after_json;

  RETURN v_team_id;
END;
$$;

-- 2. Admin delete team
CREATE OR REPLACE FUNCTION admin_delete_team(p_team_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
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

  -- Capture before state
  SELECT to_jsonb(t.*) INTO v_before_json
  FROM collection_teams t
  WHERE t.id = p_team_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Equipo no encontrado: %', p_team_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Delete team (cascade will handle related records if configured)
  DELETE FROM collection_teams WHERE id = p_team_id;

  -- Audit log
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'team',
    p_team_id,
    'delete',
    v_before_json,
    NULL;
END;
$$;

-- Update audit_log entity constraint to include 'team'
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_entity_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_entity_check
  CHECK (entity IN ('collection', 'page', 'sticker', 'image', 'user', 'team'));
