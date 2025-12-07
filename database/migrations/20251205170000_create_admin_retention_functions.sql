-- =====================================================
-- PHASE 3: ADMIN RETENTION FUNCTIONS
-- =====================================================
-- Purpose: Admin functions for account suspension, deletion management,
--          and content moderation with 90-day retention periods.
--
-- Key Behaviors:
-- 1. Suspension does NOT auto-schedule deletion (admin must explicitly move to deletion)
-- 2. Suspended users cannot log in or self-recover (only admin can unsuspend)
-- 3. Admin-suspended accounts get notification email but no deletion warnings
-- 4. All actions logged in audit_log for compliance
-- =====================================================

-- =====================================================
-- FUNCTION: admin_suspend_account
-- =====================================================
-- Suspends account indefinitely (does NOT auto-schedule deletion)
-- Admin must explicitly call admin_move_to_deletion() to start countdown
CREATE OR REPLACE FUNCTION admin_suspend_account(
    p_user_id UUID,
    p_reason TEXT
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

    -- Mark as suspended
    UPDATE profiles SET
        suspended_at = NOW(),
        suspended_by = v_admin_id,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Send suspension notification email to user
    -- Uses placeholder email system (schedule_email function from Phase 5)
    -- Will be processed when email service is configured
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
        entity_id,
        action,
        admin_id,
        user_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'moderation',
        p_user_id::BIGINT,
        'moderation',
        v_admin_id,
        p_user_id,
        'suspend_account',
        'user',
        p_user_id::BIGINT,
        p_reason,
        jsonb_build_object(
            'user_id', p_user_id,
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

COMMENT ON FUNCTION admin_suspend_account IS
    'Suspends user account indefinitely. Does NOT auto-schedule deletion - admin must explicitly call admin_move_to_deletion() to start 90-day countdown.';

-- =====================================================
-- FUNCTION: admin_move_to_deletion
-- =====================================================
-- Starts 90-day countdown for suspended account
-- Can only be called on already-suspended accounts
CREATE OR REPLACE FUNCTION admin_move_to_deletion(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_is_suspended BOOLEAN;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can move accounts to deletion';
    END IF;

    -- Verify account is suspended
    SELECT suspended_at IS NOT NULL INTO v_is_suspended
    FROM profiles
    WHERE id = p_user_id;

    IF v_is_suspended IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF NOT v_is_suspended THEN
        RAISE EXCEPTION 'Account must be suspended first. Use admin_suspend_account() to suspend.';
    END IF;

    -- Calculate deletion date (90 days from NOW, not suspension date)
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Schedule deletion (90 days from NOW)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type,
        created_at
    ) VALUES (
        'user',
        p_user_id::TEXT,
        'delete',
        v_scheduled_for,
        'admin_suspended',  -- Different from 'user_requested'
        v_admin_id,
        'admin',
        NOW()
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = v_scheduled_for,
        reason = 'admin_suspended',
        initiated_by = v_admin_id,
        initiated_by_type = 'admin',
        created_at = NOW(),
        processed_at = NULL;  -- Reset if previously processed

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        user_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'moderation',
        p_user_id::BIGINT,
        'moderation',
        v_admin_id,
        p_user_id,
        'move_to_deletion',
        'user',
        p_user_id::BIGINT,
        'Moved suspended account to deletion queue',
        jsonb_build_object(
            'user_id', p_user_id,
            'scheduled_for', v_scheduled_for,
            'reason', 'admin_suspended'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account moved to deletion queue (90 days from now)',
        'user_id', p_user_id,
        'scheduled_for', v_scheduled_for,
        'days_until_deletion', 90
    );
END;
$$;

COMMENT ON FUNCTION admin_move_to_deletion IS
    'Starts 90-day countdown for suspended account. Countdown starts from NOW, not suspension date. User will NOT receive email warnings (unlike user-initiated deletion).';

-- =====================================================
-- FUNCTION: admin_unsuspend_account
-- =====================================================
-- Restores suspended account (cancels deletion if scheduled)
CREATE OR REPLACE FUNCTION admin_unsuspend_account(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_was_suspended BOOLEAN;
    v_was_scheduled_for_deletion BOOLEAN;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can unsuspend accounts';
    END IF;

    -- Check if user exists and is suspended
    SELECT suspended_at IS NOT NULL INTO v_was_suspended
    FROM profiles
    WHERE id = p_user_id;

    IF v_was_suspended IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF NOT v_was_suspended THEN
        RAISE EXCEPTION 'User is not suspended';
    END IF;

    -- Check if scheduled for deletion
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = p_user_id::TEXT
        AND processed_at IS NULL
    ) INTO v_was_scheduled_for_deletion;

    -- Remove suspension
    UPDATE profiles SET
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Cancel any scheduled deletion
    DELETE FROM retention_schedule
    WHERE entity_type = 'user'
    AND entity_id = p_user_id::TEXT
    AND processed_at IS NULL;

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        user_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'moderation',
        p_user_id::BIGINT,
        'moderation',
        v_admin_id,
        p_user_id,
        'unsuspend_account',
        'user',
        p_user_id::BIGINT,
        'Account restored',
        jsonb_build_object(
            'user_id', p_user_id,
            'unsuspended_at', NOW(),
            'deletion_cancelled', v_was_scheduled_for_deletion
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account unsuspended and deletion cancelled',
        'user_id', p_user_id,
        'deletion_was_cancelled', v_was_scheduled_for_deletion
    );
END;
$$;

COMMENT ON FUNCTION admin_unsuspend_account IS
    'Restores suspended account and cancels any scheduled deletion. User can immediately log in again.';

-- =====================================================
-- FUNCTION: admin_delete_listing
-- =====================================================
-- Admin deletes a listing with reason (90-day retention)
CREATE OR REPLACE FUNCTION admin_delete_listing(
    p_listing_id BIGINT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_listing_exists BOOLEAN;
    v_already_deleted BOOLEAN;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete listings';
    END IF;

    -- Check if listing exists
    SELECT EXISTS (SELECT 1 FROM trade_listings WHERE id = p_listing_id) INTO v_listing_exists;
    IF NOT v_listing_exists THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Check if already deleted
    SELECT deleted_at IS NOT NULL INTO v_already_deleted
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_already_deleted THEN
        RAISE EXCEPTION 'Listing is already deleted';
    END IF;

    -- Calculate deletion date
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Mark listing as deleted
    UPDATE trade_listings SET
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin',
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Schedule permanent deletion (90 days)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type,
        created_at
    ) VALUES (
        'listing',
        p_listing_id::TEXT,
        'delete',
        v_scheduled_for,
        p_reason,
        v_admin_id,
        'admin',
        NOW()
    );

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'listing',
        p_listing_id,
        'delete',
        v_admin_id,
        'delete_listing',
        'listing',
        p_listing_id,
        p_reason,
        jsonb_build_object(
            'listing_id', p_listing_id,
            'deleted_at', NOW(),
            'scheduled_for', v_scheduled_for,
            'reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing deleted (90-day retention)',
        'listing_id', p_listing_id,
        'deleted_at', NOW(),
        'scheduled_for', v_scheduled_for
    );
END;
$$;

COMMENT ON FUNCTION admin_delete_listing IS
    'Admin deletes a listing with reason. 90-day retention applies. Hidden from users immediately, permanently deleted after retention period.';

-- =====================================================
-- FUNCTION: admin_delete_template
-- =====================================================
-- Admin deletes a template with reason (90-day retention)
-- User albums (copies) are preserved as independent entities
CREATE OR REPLACE FUNCTION admin_delete_template(
    p_template_id BIGINT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_template_exists BOOLEAN;
    v_already_deleted BOOLEAN;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete templates';
    END IF;

    -- Check if template exists
    SELECT EXISTS (SELECT 1 FROM collection_templates WHERE id = p_template_id) INTO v_template_exists;
    IF NOT v_template_exists THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Check if already deleted
    SELECT deleted_at IS NOT NULL INTO v_already_deleted
    FROM collection_templates
    WHERE id = p_template_id;

    IF v_already_deleted THEN
        RAISE EXCEPTION 'Template is already deleted';
    END IF;

    -- Calculate deletion date
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Mark template as deleted
    UPDATE collection_templates SET
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin',
        updated_at = NOW()
    WHERE id = p_template_id;

    -- Schedule permanent deletion (90 days)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type,
        created_at
    ) VALUES (
        'template',
        p_template_id::TEXT,
        'delete',
        v_scheduled_for,
        p_reason,
        v_admin_id,
        'admin',
        NOW()
    );

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'template',
        p_template_id,
        'delete',
        v_admin_id,
        'delete_template',
        'template',
        p_template_id,
        p_reason,
        jsonb_build_object(
            'template_id', p_template_id,
            'deleted_at', NOW(),
            'scheduled_for', v_scheduled_for,
            'reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Template deleted (90-day retention, albums preserved)',
        'template_id', p_template_id,
        'deleted_at', NOW(),
        'scheduled_for', v_scheduled_for,
        'note', 'User albums (copies) are preserved as independent entities'
    );
END;
$$;

COMMENT ON FUNCTION admin_delete_template IS
    'Admin deletes a template with reason. 90-day retention applies. User albums (user_template_copies) are preserved as independent entities.';

-- =====================================================
-- FUNCTION: admin_get_retention_stats
-- =====================================================
-- Dashboard statistics for retention management
CREATE OR REPLACE FUNCTION admin_get_retention_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_pending_deletions INTEGER;
    v_legal_holds INTEGER;
    v_processed_today INTEGER;
    v_next_deletion TIMESTAMPTZ;
    v_suspended_users INTEGER;
    v_deleted_users INTEGER;
    v_deleted_listings INTEGER;
    v_deleted_templates INTEGER;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view retention stats';
    END IF;

    -- Count pending deletions (not yet processed, not on legal hold)
    SELECT COUNT(*) INTO v_pending_deletions
    FROM retention_schedule
    WHERE processed_at IS NULL
    AND (legal_hold_until IS NULL OR legal_hold_until < NOW());

    -- Count legal holds (active preservation orders)
    SELECT COUNT(*) INTO v_legal_holds
    FROM retention_schedule
    WHERE legal_hold_until IS NOT NULL
    AND legal_hold_until > NOW();

    -- Count processed today
    SELECT COUNT(*) INTO v_processed_today
    FROM retention_schedule
    WHERE processed_at::DATE = CURRENT_DATE;

    -- Get next deletion timestamp
    SELECT MIN(scheduled_for) INTO v_next_deletion
    FROM retention_schedule
    WHERE processed_at IS NULL
    AND (legal_hold_until IS NULL OR legal_hold_until < NOW());

    -- Count suspended users (not deleted)
    SELECT COUNT(*) INTO v_suspended_users
    FROM profiles
    WHERE suspended_at IS NOT NULL
    AND deleted_at IS NULL;

    -- Count deleted users (in retention period)
    SELECT COUNT(*) INTO v_deleted_users
    FROM profiles
    WHERE deleted_at IS NOT NULL;

    -- Count deleted listings (in retention period)
    SELECT COUNT(*) INTO v_deleted_listings
    FROM trade_listings
    WHERE deleted_at IS NOT NULL;

    -- Count deleted templates (in retention period)
    SELECT COUNT(*) INTO v_deleted_templates
    FROM collection_templates
    WHERE deleted_at IS NOT NULL;

    RETURN jsonb_build_object(
        'pending_deletions', v_pending_deletions,
        'legal_holds', v_legal_holds,
        'processed_today', v_processed_today,
        'next_deletion', v_next_deletion,
        'suspended_users', v_suspended_users,
        'deleted_users', v_deleted_users,
        'deleted_listings', v_deleted_listings,
        'deleted_templates', v_deleted_templates,
        'generated_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION admin_get_retention_stats IS
    'Returns retention dashboard statistics: pending deletions, legal holds, suspended users, etc. Admin-only access.';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- All functions are SECURITY DEFINER and check is_admin internally
-- Grant execute to authenticated users (they'll get permission denied if not admin)

GRANT EXECUTE ON FUNCTION admin_suspend_account TO authenticated;
GRANT EXECUTE ON FUNCTION admin_move_to_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_account TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_listing TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_template TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_retention_stats TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Phase 3 complete. Next steps:
-- - Phase 4: Cleanup job with pg_cron
-- - Phase 5: Email system with placeholders
-- - Phase 6: RLS policy updates
-- =====================================================
