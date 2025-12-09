-- =====================================================
-- Migration: Fix admin functions to update is_suspended boolean
-- Created: 2025-12-09
-- Description: Updates admin_suspend_account, admin_unsuspend_account,
--              and admin_move_to_deletion to properly set the is_suspended
--              boolean field in addition to the timestamp fields.
-- =====================================================

-- 1. Fix admin_suspend_account to set is_suspended = true
CREATE OR REPLACE FUNCTION admin_suspend_account(p_user_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
    v_admin_id UUID;
    v_user_email TEXT;
    v_user_nickname TEXT;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can suspend accounts';
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if already suspended
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND suspended_at IS NOT NULL) THEN
        RAISE EXCEPTION 'User is already suspended';
    END IF;

    -- Get user info for notification
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = p_user_id;

    -- Mark as suspended (UPDATE: Now sets both is_suspended and suspended_at)
    UPDATE profiles SET
        is_suspended = true,  -- NEW: Set boolean field
        suspended_at = NOW(),
        suspended_by = v_admin_id,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Send suspension notification email to user
    INSERT INTO pending_emails (
        recipient_email,
        template_name,
        template_data,
        scheduled_for
    ) VALUES (
        v_user_email,
        'admin_suspension_notice',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'reason', p_reason,
            'suspended_at', NOW()
        ),
        NOW()
    );

    -- Log action in audit_log
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
        'suspend_account',
        'user',
        p_reason,
        jsonb_build_object(
            'user_id', p_user_id,
            'is_suspended', true,
            'suspended_at', NOW(),
            'suspended_by', v_admin_id,
            'suspension_reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User suspended (not scheduled for deletion)',
        'user_id', p_user_id,
        'suspended_at', NOW(),
        'is_scheduled_for_deletion', false
    );
END;
$$;

-- 2. Fix admin_unsuspend_account to set is_suspended = false
CREATE OR REPLACE FUNCTION admin_unsuspend_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
    v_admin_id UUID;
    v_user_email TEXT;
    v_user_nickname TEXT;
    v_had_deletion_scheduled BOOLEAN := false;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can unsuspend accounts';
    END IF;

    -- Check if user exists and is suspended
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND suspended_at IS NOT NULL) THEN
        RAISE EXCEPTION 'User is not suspended';
    END IF;

    -- Check if deletion was scheduled
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'account'
        AND entity_id = p_user_id::TEXT
        AND action = 'delete'
        AND processed_at IS NULL
    ) THEN
        v_had_deletion_scheduled := true;
    END IF;

    -- Get user info
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    SELECT nickname INTO v_user_nickname FROM profiles WHERE id = p_user_id;

    -- Clear suspension (UPDATE: Now clears both is_suspended and suspended_at)
    UPDATE profiles SET
        is_suspended = false,  -- NEW: Clear boolean field
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        deleted_at = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Cancel any scheduled deletions
    UPDATE retention_schedule SET
        processed_at = NOW(),
        processing_result = jsonb_build_object(
            'status', 'cancelled',
            'reason', 'Account unsuspended by admin',
            'admin_id', v_admin_id
        )
    WHERE entity_type = 'account'
    AND entity_id = p_user_id::TEXT
    AND action = 'delete'
    AND processed_at IS NULL;

    -- Send unsuspension notification
    INSERT INTO pending_emails (
        recipient_email,
        template_name,
        template_data,
        scheduled_for
    ) VALUES (
        v_user_email,
        'admin_unsuspension_notice',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'unsuspended_at', NOW()
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
        after_json,
        created_at
    ) VALUES (
        'user',
        'moderation',
        v_admin_id,
        p_user_id,
        'unsuspend_account',
        'user',
        jsonb_build_object(
            'user_id', p_user_id,
            'is_suspended', false,
            'unsuspended_at', NOW(),
            'had_deletion_scheduled', v_had_deletion_scheduled
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User unsuspended and deletion cancelled',
        'user_id', p_user_id,
        'deletion_was_scheduled', v_had_deletion_scheduled
    );
END;
$$;

-- 3. Fix admin_move_to_deletion to ensure is_suspended is true
CREATE OR REPLACE FUNCTION admin_move_to_deletion(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
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
        WHERE entity_type = 'account'
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

    -- Mark as deleted and ensure suspended (UPDATE: Sets both is_suspended and deleted_at)
    UPDATE profiles SET
        is_suspended = true,   -- NEW: Ensure boolean is set
        deleted_at = NOW(),
        suspended_at = COALESCE(suspended_at, NOW()),  -- Set if not already suspended
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Schedule deletion
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by_type,
        initiated_by_id,
        metadata
    ) VALUES (
        'account',
        p_user_id::TEXT,
        'delete',
        v_scheduled_for,
        'Admin-initiated deletion',
        'admin',
        v_admin_id,
        jsonb_build_object(
            'was_suspended', v_was_suspended,
            'deletion_initiated_at', NOW()
        )
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

-- =====================================================
-- NOTES:
-- - All three functions now properly maintain both:
--   * is_suspended (boolean) - for simple queries
--   * suspended_at (timestamp) - for audit trail
-- - This ensures marketplace queries work correctly
-- =====================================================
