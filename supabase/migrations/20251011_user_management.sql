-- User Management System
-- Adds ability for admins to manage users: grant/revoke admin, suspend, and delete accounts

-- Add is_suspended column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles (is_suspended) WHERE is_suspended = TRUE;

-- RPC: List all users with their profile info and stats
-- Returns: Array of user profiles with email, admin status, suspended status, created date
CREATE OR REPLACE FUNCTION admin_list_users(
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT NULL, -- 'admin', 'suspended', 'active', or NULL for all
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  nickname TEXT,
  is_admin BOOLEAN,
  is_suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  sticker_count BIGINT,
  trade_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden listar usuarios'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    u.email,
    p.nickname,
    p.is_admin,
    p.is_suspended,
    p.created_at,
    u.last_sign_in_at,
    COALESCE(sc.sticker_count, 0) AS sticker_count,
    COALESCE(tc.trade_count, 0) AS trade_count
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS sticker_count
    FROM user_stickers
    GROUP BY user_id
  ) sc ON sc.user_id = p.id
  LEFT JOIN (
    SELECT
      CASE
        WHEN creator_id IS NOT NULL THEN creator_id
        WHEN recipient_id IS NOT NULL THEN recipient_id
      END AS user_id,
      COUNT(*) AS trade_count
    FROM trades
    GROUP BY user_id
  ) tc ON tc.user_id = p.id
  WHERE
    (p_search IS NULL OR
     p.nickname ILIKE '%' || p_search || '%' OR
     u.email ILIKE '%' || p_search || '%')
    AND
    (p_filter IS NULL OR
     (p_filter = 'admin' AND p.is_admin = TRUE) OR
     (p_filter = 'suspended' AND p.is_suspended = TRUE) OR
     (p_filter = 'active' AND p.is_suspended = FALSE))
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- RPC: Update user admin role
-- Grants or revokes admin privileges
CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_user_id UUID,
  p_is_admin BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
  v_after_json JSONB;
  v_current_user_id UUID;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden modificar roles'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_current_user_id := auth.uid();

  -- Prevent admin from revoking their own admin privileges
  IF v_current_user_id = p_user_id AND p_is_admin = FALSE THEN
    RAISE EXCEPTION 'No puedes revocar tus propios privilegios de administrador'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Capture before state
  SELECT to_jsonb(profiles.*) INTO v_before_json
  FROM profiles
  WHERE id = p_user_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Update admin role
  UPDATE profiles
  SET is_admin = p_is_admin
  WHERE id = p_user_id;

  -- Capture after state
  SELECT to_jsonb(profiles.*) INTO v_after_json
  FROM profiles
  WHERE id = p_user_id;

  -- Audit log
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'user',
    NULL,
    'update',
    v_before_json,
    v_after_json;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'is_admin', p_is_admin);
END;
$$;

-- RPC: Suspend or unsuspend user
-- Suspended users cannot log in
CREATE OR REPLACE FUNCTION admin_suspend_user(
  p_user_id UUID,
  p_is_suspended BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
  v_after_json JSONB;
  v_current_user_id UUID;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden suspender usuarios'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_current_user_id := auth.uid();

  -- Prevent admin from suspending themselves
  IF v_current_user_id = p_user_id THEN
    RAISE EXCEPTION 'No puedes suspender tu propia cuenta'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Capture before state
  SELECT to_jsonb(profiles.*) INTO v_before_json
  FROM profiles
  WHERE id = p_user_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Update suspension status
  UPDATE profiles
  SET is_suspended = p_is_suspended
  WHERE id = p_user_id;

  -- Capture after state
  SELECT to_jsonb(profiles.*) INTO v_after_json
  FROM profiles
  WHERE id = p_user_id;

  -- Audit log
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'user',
    NULL,
    'update',
    v_before_json,
    v_after_json;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'is_suspended', p_is_suspended);
END;
$$;

-- RPC: Delete user account
-- Cascades to all related data (trades, stickers, etc.)
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
  v_current_user_id UUID;
  v_email TEXT;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden eliminar usuarios'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_current_user_id := auth.uid();

  -- Prevent admin from deleting themselves
  IF v_current_user_id = p_user_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Capture before state
  SELECT to_jsonb(p.*), u.email INTO v_before_json, v_email
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_user_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Audit log before deletion
  INSERT INTO audit_log (user_id, admin_nickname, entity, entity_id, action, before_json, after_json)
  SELECT
    v_current_user_id,
    (SELECT nickname FROM profiles WHERE id = v_current_user_id),
    'user',
    NULL,
    'delete',
    v_before_json,
    NULL;

  -- Delete profile (cascades via foreign keys)
  DELETE FROM profiles WHERE id = p_user_id;

  -- Delete from auth.users (admin-level operation)
  -- Note: This requires elevated permissions in Supabase
  -- In production, you may want to handle this via Supabase Admin API instead
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'email', v_email);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar usuario: %', SQLERRM
      USING ERRCODE = 'internal_error';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_list_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
