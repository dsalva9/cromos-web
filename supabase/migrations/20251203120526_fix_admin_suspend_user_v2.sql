-- Fix admin_suspend_user_v2 to not use log_moderation_action with UUID cast to BIGINT
-- Instead, log directly to audit_log table

CREATE OR REPLACE FUNCTION admin_suspend_user_v2(
    p_user_id UUID,
    p_is_suspended BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_old_is_suspended BOOLEAN;
    v_admin_id UUID;
    v_target_nickname TEXT;
BEGIN
    -- Get current admin user ID
    v_admin_id := auth.uid();

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_admin_id AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Prevent admins from suspending themselves
    IF p_user_id = v_admin_id AND p_is_suspended = TRUE THEN
        RAISE EXCEPTION 'Admins cannot suspend themselves';
    END IF;

    -- Get current suspension status and nickname
    SELECT is_suspended, nickname INTO v_old_is_suspended, v_target_nickname
    FROM profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Update user suspension status
    UPDATE profiles
    SET is_suspended = p_is_suspended, updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the action directly to audit_log
    INSERT INTO audit_log (
        user_id,
        admin_id,
        entity,
        entity_type,
        action,
        moderation_action_type,
        moderated_entity_type,
        moderation_reason,
        old_values,
        new_values,
        occurred_at
    ) VALUES (
        p_user_id,
        v_admin_id,
        'user',
        'user',
        'moderation',
        CASE WHEN p_is_suspended THEN 'suspend_user' ELSE 'unsuspend_user' END,
        'user',
        p_reason,
        jsonb_build_object(
            'is_suspended', v_old_is_suspended,
            'user_id', p_user_id,
            'nickname', v_target_nickname
        ),
        jsonb_build_object(
            'is_suspended', p_is_suspended,
            'user_id', p_user_id,
            'nickname', v_target_nickname,
            'suspended_by', v_admin_id,
            'suspended_at', NOW()
        ),
        NOW()
    );
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION admin_suspend_user_v2(UUID, BOOLEAN, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_suspend_user_v2(UUID, BOOLEAN, TEXT) IS
'Allows admins to suspend or unsuspend a user account. Creates an audit log entry for the action.';
