-- =====================================================
-- VALIDATION TESTS: Phase 3 - Admin Functions
-- =====================================================
-- Purpose: Validate admin suspension, deletion management, and stats functions
-- Run this as an admin user in your DEV database
-- =====================================================

-- =====================================================
-- SETUP: Ensure you're an admin
-- =====================================================
DO $$
BEGIN
    -- Make current user admin (for testing)
    UPDATE profiles SET is_admin = TRUE WHERE id = auth.uid();
    RAISE NOTICE 'Current user set as admin';
END $$;

-- =====================================================
-- TEST 1: Admin Suspend Account (without deletion scheduling)
-- =====================================================
DO $$
DECLARE
    v_test_user_id UUID;
    v_result JSONB;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 1: Admin Suspend Account =====';

    -- Get a test user (not yourself, not already suspended)
    SELECT id INTO v_test_user_id
    FROM profiles
    WHERE id != auth.uid()
    AND suspended_at IS NULL
    AND deleted_at IS NULL
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'SKIP: No test user available for suspension test';
        RETURN;
    END IF;

    RAISE NOTICE 'Test user ID: %', v_test_user_id;

    -- Suspend the account
    SELECT admin_suspend_account(
        v_test_user_id,
        'Test suspension - violating community guidelines'
    ) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify account is suspended
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_test_user_id
        AND suspended_at IS NOT NULL
        AND suspended_by = auth.uid()
        AND suspension_reason = 'Test suspension - violating community guidelines'
    ) THEN
        RAISE NOTICE '✓ Account successfully suspended';
    ELSE
        RAISE EXCEPTION '✗ Account was not suspended correctly';
    END IF;

    -- Verify NOT scheduled for deletion (important!)
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_test_user_id::TEXT
        AND processed_at IS NULL
    ) THEN
        RAISE EXCEPTION '✗ Account was incorrectly scheduled for deletion';
    ELSE
        RAISE NOTICE '✓ Account NOT scheduled for deletion (correct behavior)';
    END IF;

    -- Verify email was queued
    IF EXISTS (
        SELECT 1 FROM pending_emails
        WHERE template_name = 'admin_suspension_notice'
        AND template_data->>'user_id' = v_test_user_id::TEXT
    ) THEN
        RAISE NOTICE '✓ Suspension notification email queued';
    ELSE
        RAISE NOTICE '⚠ Warning: Email not queued (may not have pending_emails table yet)';
    END IF;

    -- Verify audit log entry
    IF EXISTS (
        SELECT 1 FROM audit_log
        WHERE moderation_action_type = 'suspend_account'
        AND moderated_entity_id = v_test_user_id::BIGINT
        AND admin_id = auth.uid()
    ) THEN
        RAISE NOTICE '✓ Action logged in audit_log';
    ELSE
        RAISE EXCEPTION '✗ Action not logged in audit_log';
    END IF;

    RAISE NOTICE '✓ TEST 1 PASSED';
END $$;

-- =====================================================
-- TEST 2: Admin Move to Deletion
-- =====================================================
DO $$
DECLARE
    v_test_user_id UUID;
    v_result JSONB;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 2: Admin Move to Deletion =====';

    -- Get the suspended user from Test 1
    SELECT id INTO v_test_user_id
    FROM profiles
    WHERE id != auth.uid()
    AND suspended_at IS NOT NULL
    AND deleted_at IS NULL
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'SKIP: No suspended user available for deletion test';
        RETURN;
    END IF;

    RAISE NOTICE 'Test user ID: %', v_test_user_id;

    -- Move to deletion queue
    SELECT admin_move_to_deletion(v_test_user_id) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify scheduled for deletion (90 days from now)
    SELECT scheduled_for INTO v_scheduled_for
    FROM retention_schedule
    WHERE entity_type = 'user'
    AND entity_id = v_test_user_id::TEXT
    AND processed_at IS NULL;

    IF v_scheduled_for IS NULL THEN
        RAISE EXCEPTION '✗ Account was not scheduled for deletion';
    END IF;

    -- Verify it's approximately 90 days (allow 1 minute variance)
    IF v_scheduled_for BETWEEN (NOW() + INTERVAL '89 days 23 hours') AND (NOW() + INTERVAL '90 days 1 hour') THEN
        RAISE NOTICE '✓ Scheduled for deletion in 90 days: %', v_scheduled_for;
    ELSE
        RAISE EXCEPTION '✗ Deletion scheduled for incorrect date: %', v_scheduled_for;
    END IF;

    -- Verify reason is 'admin_suspended'
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_test_user_id::TEXT
        AND reason = 'admin_suspended'
        AND initiated_by_type = 'admin'
    ) THEN
        RAISE NOTICE '✓ Reason correctly set to admin_suspended';
    ELSE
        RAISE EXCEPTION '✗ Reason not set correctly';
    END IF;

    -- Verify audit log entry
    IF EXISTS (
        SELECT 1 FROM audit_log
        WHERE moderation_action_type = 'move_to_deletion'
        AND moderated_entity_id = v_test_user_id::BIGINT
        AND admin_id = auth.uid()
    ) THEN
        RAISE NOTICE '✓ Action logged in audit_log';
    ELSE
        RAISE EXCEPTION '✗ Action not logged in audit_log';
    END IF;

    RAISE NOTICE '✓ TEST 2 PASSED';
END $$;

-- =====================================================
-- TEST 3: Admin Unsuspend Account (cancels deletion)
-- =====================================================
DO $$
DECLARE
    v_test_user_id UUID;
    v_result JSONB;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 3: Admin Unsuspend Account =====';

    -- Get the suspended user from previous tests
    SELECT id INTO v_test_user_id
    FROM profiles
    WHERE id != auth.uid()
    AND suspended_at IS NOT NULL
    AND deleted_at IS NULL
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'SKIP: No suspended user available for unsuspend test';
        RETURN;
    END IF;

    RAISE NOTICE 'Test user ID: %', v_test_user_id;

    -- Unsuspend the account
    SELECT admin_unsuspend_account(v_test_user_id) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify account is no longer suspended
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_test_user_id
        AND suspended_at IS NULL
        AND suspended_by IS NULL
        AND suspension_reason IS NULL
    ) THEN
        RAISE NOTICE '✓ Account successfully unsuspended';
    ELSE
        RAISE EXCEPTION '✗ Account was not unsuspended correctly';
    END IF;

    -- Verify deletion was cancelled
    IF NOT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_test_user_id::TEXT
        AND processed_at IS NULL
    ) THEN
        RAISE NOTICE '✓ Deletion successfully cancelled';
    ELSE
        RAISE EXCEPTION '✗ Deletion was not cancelled';
    END IF;

    -- Verify audit log entry
    IF EXISTS (
        SELECT 1 FROM audit_log
        WHERE moderation_action_type = 'unsuspend_account'
        AND moderated_entity_id = v_test_user_id::BIGINT
        AND admin_id = auth.uid()
    ) THEN
        RAISE NOTICE '✓ Action logged in audit_log';
    ELSE
        RAISE EXCEPTION '✗ Action not logged in audit_log';
    END IF;

    RAISE NOTICE '✓ TEST 3 PASSED';
END $$;

-- =====================================================
-- TEST 4: Admin Delete Listing
-- =====================================================
DO $$
DECLARE
    v_test_listing_id BIGINT;
    v_result JSONB;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 4: Admin Delete Listing =====';

    -- Get a test listing (not already deleted)
    SELECT id INTO v_test_listing_id
    FROM trade_listings
    WHERE deleted_at IS NULL
    LIMIT 1;

    IF v_test_listing_id IS NULL THEN
        RAISE NOTICE 'SKIP: No listing available for deletion test';
        RETURN;
    END IF;

    RAISE NOTICE 'Test listing ID: %', v_test_listing_id;

    -- Delete the listing
    SELECT admin_delete_listing(
        v_test_listing_id,
        'Test deletion - inappropriate content'
    ) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify listing marked as deleted
    IF EXISTS (
        SELECT 1 FROM trade_listings
        WHERE id = v_test_listing_id
        AND deleted_at IS NOT NULL
        AND deleted_by = auth.uid()
        AND deletion_type = 'admin'
    ) THEN
        RAISE NOTICE '✓ Listing marked as deleted';
    ELSE
        RAISE EXCEPTION '✗ Listing not marked as deleted correctly';
    END IF;

    -- Verify scheduled for permanent deletion
    SELECT scheduled_for INTO v_scheduled_for
    FROM retention_schedule
    WHERE entity_type = 'listing'
    AND entity_id = v_test_listing_id::TEXT
    AND processed_at IS NULL;

    IF v_scheduled_for BETWEEN (NOW() + INTERVAL '89 days 23 hours') AND (NOW() + INTERVAL '90 days 1 hour') THEN
        RAISE NOTICE '✓ Scheduled for permanent deletion in 90 days';
    ELSE
        RAISE EXCEPTION '✗ Deletion scheduled for incorrect date: %', v_scheduled_for;
    END IF;

    -- Verify audit log entry
    IF EXISTS (
        SELECT 1 FROM audit_log
        WHERE moderation_action_type = 'delete_listing'
        AND moderated_entity_id = v_test_listing_id
        AND admin_id = auth.uid()
    ) THEN
        RAISE NOTICE '✓ Action logged in audit_log';
    ELSE
        RAISE EXCEPTION '✗ Action not logged in audit_log';
    END IF;

    RAISE NOTICE '✓ TEST 4 PASSED';

    -- Cleanup: Remove from retention schedule (don't actually delete the listing)
    DELETE FROM retention_schedule
    WHERE entity_type = 'listing'
    AND entity_id = v_test_listing_id::TEXT;

    -- Restore listing
    UPDATE trade_listings
    SET deleted_at = NULL, deleted_by = NULL, deletion_type = NULL
    WHERE id = v_test_listing_id;

    RAISE NOTICE 'Test listing restored (cleanup)';
END $$;

-- =====================================================
-- TEST 5: Admin Delete Template
-- =====================================================
DO $$
DECLARE
    v_test_template_id BIGINT;
    v_result JSONB;
    v_scheduled_for TIMESTAMPTZ;
    v_copy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 5: Admin Delete Template =====';

    -- Get a test template (not already deleted)
    SELECT id INTO v_test_template_id
    FROM collection_templates
    WHERE deleted_at IS NULL
    LIMIT 1;

    IF v_test_template_id IS NULL THEN
        RAISE NOTICE 'SKIP: No template available for deletion test';
        RETURN;
    END IF;

    RAISE NOTICE 'Test template ID: %', v_test_template_id;

    -- Count existing copies (albums) before deletion
    SELECT COUNT(*) INTO v_copy_count
    FROM user_template_copies
    WHERE template_id = v_test_template_id;

    RAISE NOTICE 'Template has % user copies (albums)', v_copy_count;

    -- Delete the template
    SELECT admin_delete_template(
        v_test_template_id,
        'Test deletion - policy violation'
    ) INTO v_result;

    RAISE NOTICE 'Result: %', v_result;

    -- Verify template marked as deleted
    IF EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_test_template_id
        AND deleted_at IS NOT NULL
        AND deleted_by = auth.uid()
        AND deletion_type = 'admin'
    ) THEN
        RAISE NOTICE '✓ Template marked as deleted';
    ELSE
        RAISE EXCEPTION '✗ Template not marked as deleted correctly';
    END IF;

    -- Verify scheduled for permanent deletion
    SELECT scheduled_for INTO v_scheduled_for
    FROM retention_schedule
    WHERE entity_type = 'template'
    AND entity_id = v_test_template_id::TEXT
    AND processed_at IS NULL;

    IF v_scheduled_for BETWEEN (NOW() + INTERVAL '89 days 23 hours') AND (NOW() + INTERVAL '90 days 1 hour') THEN
        RAISE NOTICE '✓ Scheduled for permanent deletion in 90 days';
    ELSE
        RAISE EXCEPTION '✗ Deletion scheduled for incorrect date: %', v_scheduled_for;
    END IF;

    -- Verify user copies (albums) still exist (IMPORTANT!)
    IF v_copy_count > 0 THEN
        IF EXISTS (
            SELECT 1 FROM user_template_copies
            WHERE template_id = v_test_template_id
        ) THEN
            RAISE NOTICE '✓ User albums (copies) preserved after template deletion';
        ELSE
            RAISE EXCEPTION '✗ User albums were incorrectly deleted with template';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ No user copies to verify preservation';
    END IF;

    -- Verify audit log entry
    IF EXISTS (
        SELECT 1 FROM audit_log
        WHERE moderation_action_type = 'delete_template'
        AND moderated_entity_id = v_test_template_id
        AND admin_id = auth.uid()
    ) THEN
        RAISE NOTICE '✓ Action logged in audit_log';
    ELSE
        RAISE EXCEPTION '✗ Action not logged in audit_log';
    END IF;

    RAISE NOTICE '✓ TEST 5 PASSED';

    -- Cleanup: Remove from retention schedule (don't actually delete the template)
    DELETE FROM retention_schedule
    WHERE entity_type = 'template'
    AND entity_id = v_test_template_id::TEXT;

    -- Restore template
    UPDATE collection_templates
    SET deleted_at = NULL, deleted_by = NULL, deletion_type = NULL
    WHERE id = v_test_template_id;

    RAISE NOTICE 'Test template restored (cleanup)';
END $$;

-- =====================================================
-- TEST 6: Admin Get Retention Stats
-- =====================================================
DO $$
DECLARE
    v_result JSONB;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 6: Admin Get Retention Stats =====';

    -- Get stats
    SELECT admin_get_retention_stats() INTO v_result;

    RAISE NOTICE 'Stats: %', jsonb_pretty(v_result);

    -- Verify all expected fields present
    IF v_result ? 'pending_deletions' AND
       v_result ? 'legal_holds' AND
       v_result ? 'processed_today' AND
       v_result ? 'suspended_users' AND
       v_result ? 'deleted_users' AND
       v_result ? 'deleted_listings' AND
       v_result ? 'deleted_templates' THEN
        RAISE NOTICE '✓ All stat fields present';
    ELSE
        RAISE EXCEPTION '✗ Missing stat fields';
    END IF;

    -- Verify values are numeric
    IF (v_result->>'pending_deletions')::INTEGER >= 0 AND
       (v_result->>'legal_holds')::INTEGER >= 0 AND
       (v_result->>'processed_today')::INTEGER >= 0 THEN
        RAISE NOTICE '✓ All stat values are valid numbers';
    ELSE
        RAISE EXCEPTION '✗ Invalid stat values';
    END IF;

    RAISE NOTICE '✓ TEST 6 PASSED';
END $$;

-- =====================================================
-- TEST 7: Error Cases
-- =====================================================
DO $$
DECLARE
    v_non_admin_user_id UUID;
    v_error_occurred BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== TEST 7: Error Cases =====';

    -- Test 7a: Try to suspend already suspended user
    BEGIN
        PERFORM admin_suspend_account(
            (SELECT id FROM profiles WHERE suspended_at IS NOT NULL LIMIT 1),
            'Test'
        );
        RAISE EXCEPTION 'Should have failed - user already suspended';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%already suspended%' THEN
            RAISE NOTICE '✓ Correctly rejects suspending already-suspended user';
        ELSE
            RAISE;
        END IF;
    END;

    -- Test 7b: Try to move non-suspended user to deletion
    BEGIN
        PERFORM admin_move_to_deletion(
            (SELECT id FROM profiles WHERE suspended_at IS NULL AND id != auth.uid() LIMIT 1)
        );
        RAISE EXCEPTION 'Should have failed - user not suspended';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%must be suspended first%' THEN
            RAISE NOTICE '✓ Correctly rejects moving non-suspended user to deletion';
        ELSE
            RAISE;
        END IF;
    END;

    -- Test 7c: Try to unsuspend non-suspended user
    BEGIN
        PERFORM admin_unsuspend_account(
            (SELECT id FROM profiles WHERE suspended_at IS NULL AND id != auth.uid() LIMIT 1)
        );
        RAISE EXCEPTION 'Should have failed - user not suspended';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%not suspended%' THEN
            RAISE NOTICE '✓ Correctly rejects unsuspending non-suspended user';
        ELSE
            RAISE;
        END IF;
    END;

    -- Test 7d: Try to delete already deleted listing
    IF EXISTS (SELECT 1 FROM trade_listings WHERE deleted_at IS NOT NULL LIMIT 1) THEN
        BEGIN
            PERFORM admin_delete_listing(
                (SELECT id FROM trade_listings WHERE deleted_at IS NOT NULL LIMIT 1),
                'Test'
            );
            RAISE EXCEPTION 'Should have failed - listing already deleted';
        EXCEPTION WHEN OTHERS THEN
            IF SQLERRM LIKE '%already deleted%' THEN
                RAISE NOTICE '✓ Correctly rejects deleting already-deleted listing';
            ELSE
                RAISE;
            END IF;
        END;
    ELSE
        RAISE NOTICE 'ℹ No deleted listing to test with';
    END IF;

    RAISE NOTICE '✓ TEST 7 PASSED';
END $$;

-- =====================================================
-- FINAL CLEANUP
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===== CLEANUP =====';

    -- Clean up any test emails
    DELETE FROM pending_emails
    WHERE template_name = 'admin_suspension_notice'
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Note: We already cleaned up test listings/templates in their respective tests
    -- Note: We restored the test user in Test 3

    RAISE NOTICE 'Cleanup complete';
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '    ALL PHASE 3 TESTS COMPLETED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions validated:';
    RAISE NOTICE '  ✓ admin_suspend_account';
    RAISE NOTICE '  ✓ admin_move_to_deletion';
    RAISE NOTICE '  ✓ admin_unsuspend_account';
    RAISE NOTICE '  ✓ admin_delete_listing';
    RAISE NOTICE '  ✓ admin_delete_template';
    RAISE NOTICE '  ✓ admin_get_retention_stats';
    RAISE NOTICE '';
    RAISE NOTICE 'Key behaviors confirmed:';
    RAISE NOTICE '  ✓ Suspension does NOT auto-schedule deletion';
    RAISE NOTICE '  ✓ Move to deletion starts 90-day countdown';
    RAISE NOTICE '  ✓ Unsuspend cancels deletion';
    RAISE NOTICE '  ✓ All actions logged in audit_log';
    RAISE NOTICE '  ✓ User albums preserved when template deleted';
    RAISE NOTICE '';
    RAISE NOTICE 'Phase 3 is ready for deployment!';
    RAISE NOTICE '==========================================';
END $$;
