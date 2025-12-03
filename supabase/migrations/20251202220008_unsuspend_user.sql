-- =====================================================
-- UNSUSPEND USER FUNCTION
-- =====================================================
-- Purpose: Allow admins to unsuspend user accounts
-- =====================================================

CREATE OR REPLACE FUNCTION unsuspend_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_target_nickname TEXT;
BEGIN
  -- Get current user ID
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get target user nickname
  SELECT nickname INTO v_target_nickname
  FROM profiles
  WHERE id = target_user_id;

  IF v_target_nickname IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Unsuspend the user
  UPDATE profiles
  SET
    is_suspended = false,
    updated_at = now()
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO audit_log (
    user_id,
    admin_id,
    entity,
    entity_type,
    action,
    moderation_action_type,
    moderated_entity_type,
    moderation_reason,
    new_values,
    occurred_at
  ) VALUES (
    target_user_id,
    v_admin_id,
    'user',
    'user',
    'moderation',
    'unsuspend_user',
    'user',
    'Admin unsuspended user account',
    jsonb_build_object(
      'user_id', target_user_id,
      'nickname', v_target_nickname,
      'unsuspended_by', v_admin_id,
      'unsuspended_at', now()
    ),
    now()
  );

END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION unsuspend_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION unsuspend_user(UUID) IS
'Allows admins to unsuspend a user account. Creates an audit log entry for the action.';
