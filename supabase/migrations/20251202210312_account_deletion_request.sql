-- =====================================================
-- USER ACCOUNT DELETION REQUEST
-- =====================================================
-- Purpose: Allow users to request account deletion
-- Flow: User requests deletion -> Account suspended -> Admin notified -> Manual deletion
-- =====================================================

-- Function to request account deletion
-- This suspends the user's account and creates an audit log entry for admin review
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_nickname TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user nickname for the audit log
  SELECT nickname INTO v_user_nickname
  FROM profiles
  WHERE id = v_user_id;

  -- Check if user is already suspended
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id AND is_suspended = true
  ) THEN
    RAISE EXCEPTION 'Account is already suspended';
  END IF;

  -- Suspend the user account
  UPDATE profiles
  SET
    is_suspended = true,
    updated_at = now()
  WHERE id = v_user_id;

  -- Create audit log entry for admin review
  INSERT INTO audit_log (
    user_id,
    entity,
    entity_type,
    entity_id,
    action,
    moderation_action_type,
    moderated_entity_type,
    moderation_reason,
    new_values,
    occurred_at
  ) VALUES (
    v_user_id,
    'user',
    'user',
    NULL, -- No specific entity_id since this is about the user themselves
    'moderation',
    'account_deletion_request',
    'user',
    'User requested account deletion',
    jsonb_build_object(
      'user_id', v_user_id,
      'nickname', v_user_nickname,
      'requested_at', now(),
      'status', 'pending_admin_review'
    ),
    now()
  );

  -- Note: We don't create a notification here because admins should check audit logs
  -- In a production system, you might want to:
  -- 1. Send an email to admins
  -- 2. Create a notification in an admin dashboard
  -- 3. Post to a monitoring/alerting system

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION request_account_deletion() TO authenticated;

-- Add comment
COMMENT ON FUNCTION request_account_deletion() IS
'Allows a user to request deletion of their account. Suspends the account immediately and creates an audit log entry for admin review. Admins must manually delete the account after reviewing the request.';
