-- Migration: 20251205144458_create_user_deletion_functions.sql
-- Phase 2: User Deletion Functions

-- =====================================================
-- USER DELETION FUNCTIONS
-- =====================================================
-- Functions for users to delete their own content
-- All deletions include 90-day retention period
-- =====================================================

-- =====================================================
-- Drop old placeholder deletion functions
-- (Replace with retention-aware versions)
-- =====================================================

DROP FUNCTION IF EXISTS delete_template(bigint, text);
DROP FUNCTION IF EXISTS delete_listing(bigint) CASCADE;

-- =====================================================
-- Function: delete_listing
-- User deletes their own listing
-- =====================================================

CREATE OR REPLACE FUNCTION delete_listing(
    p_listing_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_listing_owner UUID;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify listing exists and user owns it
    SELECT user_id INTO v_listing_owner
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_listing_owner IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_listing_owner != v_user_id THEN
        RAISE EXCEPTION 'Permission denied: You can only delete your own listings';
    END IF;

    -- Mark listing as deleted
    UPDATE trade_listings SET
        deleted_at = NOW(),
        deleted_by = v_user_id,
        deletion_type = 'user',
        status = 'removed',
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
        initiated_by_type
    ) VALUES (
        'listing',
        p_listing_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        'user_deleted',
        v_user_id,
        'user'
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = NOW() + INTERVAL '90 days',
        reason = 'user_deleted',
        initiated_by = v_user_id,
        initiated_by_type = 'user';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing deleted successfully. Recoverable for 90 days by contacting support.',
        'deleted_at', NOW(),
        'permanent_deletion_at', NOW() + INTERVAL '90 days'
    );
END;
$$;

COMMENT ON FUNCTION delete_listing IS
    'User deletes their own listing. Listing is hidden immediately and scheduled for permanent deletion after 90 days.';

-- =====================================================
-- Function: delete_template
-- User deletes their own template
-- Special handling: Highly rated public templates are archived instead
-- =====================================================

CREATE OR REPLACE FUNCTION delete_template(
    p_template_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_template_owner UUID;
    v_rating_avg DECIMAL;
    v_rating_count INTEGER;
    v_is_public BOOLEAN;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify template exists and user owns it
    SELECT author_id, rating_avg, rating_count, is_public
    INTO v_template_owner, v_rating_avg, v_rating_count, v_is_public
    FROM collection_templates
    WHERE id = p_template_id;

    IF v_template_owner IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    IF v_template_owner != v_user_id THEN
        RAISE EXCEPTION 'Permission denied: You can only delete your own templates';
    END IF;

    -- Check if template should be archived (highly rated public template)
    IF v_is_public = TRUE
       AND v_rating_avg >= 4.0
       AND v_rating_count >= 10 THEN

        -- Archive: Anonymize author but keep template public
        UPDATE collection_templates SET
            author_id = NULL,  -- Anonymize
            updated_at = NOW()
        WHERE id = p_template_id;

        RETURN jsonb_build_object(
            'success', true,
            'archived', true,
            'message', 'Template is highly rated and will remain public as "[Deleted User]" contribution. Your authorship has been anonymized.'
        );
    END IF;

    -- Mark template as deleted (normal flow)
    UPDATE collection_templates SET
        deleted_at = NOW(),
        deleted_by = v_user_id,
        deletion_type = 'user',
        is_public = FALSE,  -- Hide immediately
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
        initiated_by_type
    ) VALUES (
        'template',
        p_template_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        'user_deleted',
        v_user_id,
        'user'
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = NOW() + INTERVAL '90 days',
        reason = 'user_deleted',
        initiated_by = v_user_id,
        initiated_by_type = 'user';

    RETURN jsonb_build_object(
        'success', true,
        'archived', false,
        'message', 'Template deleted successfully. Recoverable for 90 days by contacting support.',
        'deleted_at', NOW(),
        'permanent_deletion_at', NOW() + INTERVAL '90 days'
    );
END;
$$;

COMMENT ON FUNCTION delete_template IS
    'User deletes their own template. Highly rated public templates (4+ stars, 10+ ratings) are archived instead of deleted.';

-- =====================================================
-- Function: delete_account
-- User requests account deletion
-- 90-day recovery period, user is suspended immediately
-- =====================================================

CREATE OR REPLACE FUNCTION delete_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_nickname TEXT;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get user details for email notification
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = v_user_id;

    -- Mark account as deleted and suspended (immediate effect)
    UPDATE profiles SET
        deleted_at = NOW(),
        is_suspended = TRUE,
        deletion_reason = 'user_requested',
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Mark all user's listings as deleted
    UPDATE trade_listings SET
        deleted_at = NOW(),
        deleted_by = v_user_id,
        deletion_type = 'user',
        status = 'removed',
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND deleted_at IS NULL;

    -- Mark all user's templates as deleted (except archived ones)
    UPDATE collection_templates SET
        deleted_at = NOW(),
        deleted_by = v_user_id,
        deletion_type = 'user',
        is_public = FALSE,
        updated_at = NOW()
    WHERE author_id = v_user_id
    AND deleted_at IS NULL
    AND author_id IS NOT NULL;  -- Don't affect already archived templates

    -- Schedule account for permanent deletion (90 days)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type
    ) VALUES (
        'user',
        v_user_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        'user_requested',
        v_user_id,
        'user'
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = NOW() + INTERVAL '90 days',
        reason = 'user_requested',
        initiated_by = v_user_id,
        initiated_by_type = 'user';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deletion scheduled. You have 90 days to cancel via the recovery link sent to your email.',
        'deleted_at', NOW(),
        'permanent_deletion_at', NOW() + INTERVAL '90 days',
        'recovery_period_days', 90,
        'user_email', v_user_email
    );
END;
$$;

COMMENT ON FUNCTION delete_account IS
    'User requests account deletion. Account is suspended immediately, data retained for 90 days for recovery.';

-- =====================================================
-- Function: cancel_account_deletion
-- User cancels their account deletion request
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_was_scheduled BOOLEAN;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if account is actually scheduled for deletion
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_user_id::TEXT
        AND processed_at IS NULL
    ) INTO v_was_scheduled;

    IF NOT v_was_scheduled THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Account is not scheduled for deletion'
        );
    END IF;

    -- Restore account
    UPDATE profiles SET
        deleted_at = NULL,
        is_suspended = FALSE,
        deletion_reason = NULL,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Restore all user's listings
    UPDATE trade_listings SET
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_type = NULL,
        status = 'active',
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND deletion_type = 'user';  -- Only restore user-deleted listings, not admin-deleted

    -- Restore all user's templates
    UPDATE collection_templates SET
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_type = NULL,
        is_public = TRUE,  -- Restore to public if it was public before
        updated_at = NOW()
    WHERE author_id = v_user_id
    AND deletion_type = 'user';  -- Only restore user-deleted templates

    -- Remove from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_type = 'user'
    AND entity_id = v_user_id::TEXT
    AND processed_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deletion cancelled. Your account and content have been restored.'
    );
END;
$$;

COMMENT ON FUNCTION cancel_account_deletion IS
    'User cancels their account deletion request. Restores account and all user-deleted content.';

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION delete_listing TO authenticated;
GRANT EXECUTE ON FUNCTION delete_template TO authenticated;
GRANT EXECUTE ON FUNCTION delete_account TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion TO authenticated;
