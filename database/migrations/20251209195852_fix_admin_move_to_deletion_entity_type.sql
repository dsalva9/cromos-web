-- Fix admin_move_to_deletion to use 'user' entity_type instead of 'account'
-- The retention_schedule check constraint only allows specific entity types,
-- and 'account' is not one of them - should be 'user'

CREATE OR REPLACE FUNCTION admin_move_to_deletion(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_id UUID;
    v_user_email TEXT;
    v_user_nickname TEXT;
    v_scheduled_for TIMESTAMP;
    v_was_suspended BOOLEAN;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can schedule account deletion';
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if already scheduled for deletion
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'  -- FIXED: Changed from 'account' to 'user'
        AND entity_id = p_user_id::TEXT
        AND action = 'delete'
        AND processed_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User is already scheduled for deletion';
    END IF;

    -- Get user info
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    SELECT nickname, (suspended_at IS NOT NULL) INTO v_user_nickname, v_was_suspended
    FROM profiles WHERE id = p_user_id;

    -- Calculate scheduled deletion date (90 days from now)
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Mark as deleted and ensure suspended
    UPDATE profiles SET
        is_suspended = true,
        deleted_at = NOW(),
        suspended_at = COALESCE(suspended_at, NOW()),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Schedule deletion (FIXED: Use 'user' instead of 'account')
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by_type,
        initiated_by
    ) VALUES (
        'user',  -- FIXED: Changed from 'account' to 'user' to match check constraint
        p_user_id::TEXT,
        'delete',
        v_scheduled_for,
        'Admin-initiated deletion',
        'admin',
        v_admin_id
    );

    -- Send deletion warning email
    INSERT INTO pending_emails (
        recipient_email,
        template_name,
        template_data,
        scheduled_for
    ) VALUES (
        v_user_email,
        'admin_deletion_scheduled',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'scheduled_for', v_scheduled_for,
            'days_until_deletion', 90
        ),
        NOW()
    );

    -- Log action
    INSERT INTO audit_log (
        entity,
        action,
        admin_id,
        user_id,
        moderation_action_type,
        moderated_entity_type,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'user',
        'moderation',
        v_admin_id,
        p_user_id,
        'schedule_deletion',
        'user',
        'Admin-initiated deletion',
        jsonb_build_object(
            'user_id', p_user_id,
            'is_suspended', true,
            'deleted_at', NOW(),
            'scheduled_for', v_scheduled_for
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User marked for deletion with 90-day retention',
        'user_id', p_user_id,
        'scheduled_for', v_scheduled_for,
        'days_until_deletion', 90
    );
END;
$$;

COMMENT ON FUNCTION admin_move_to_deletion IS
    'Starts 90-day countdown for suspended account. Marks user as deleted immediately and schedules full data deletion after 90 days.';
