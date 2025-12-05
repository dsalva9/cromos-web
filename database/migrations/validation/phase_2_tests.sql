-- =====================================================
-- PHASE 2 VALIDATION TESTS
-- =====================================================
-- Run these tests AFTER applying migration 20251205144458
-- =====================================================

-- Test 1: Verify all functions were created
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'delete_listing',
    'delete_template',
    'delete_account',
    'cancel_account_deletion'
)
ORDER BY routine_name;

-- ✅ Expected: 4 rows (all functions exist)

-- =====================================================
-- IMPORTANT: The following tests require a logged-in user
-- Run these tests while authenticated as a real user
-- =====================================================

-- Test 2: Test delete_listing function
-- (You need to have a listing to test with)
DO $$
DECLARE
    v_test_listing_id BIGINT;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'SKIPPED: Not authenticated. Please log in to test delete_listing.';
        RETURN;
    END IF;

    -- Create a test listing
    INSERT INTO trade_listings (user_id, title, description, collection_name, status)
    VALUES (v_user_id, 'TEST LISTING - DELETE ME', 'Test description', 'Test Collection', 'active')
    RETURNING id INTO v_test_listing_id;

    RAISE NOTICE 'Created test listing with ID: %', v_test_listing_id;

    -- Delete it
    SELECT delete_listing(v_test_listing_id) INTO v_result;

    RAISE NOTICE 'Delete result: %', v_result;

    -- Verify it was marked as deleted
    IF EXISTS (
        SELECT 1 FROM trade_listings
        WHERE id = v_test_listing_id
        AND deleted_at IS NOT NULL
        AND deleted_by = v_user_id
        AND deletion_type = 'user'
        AND status = 'removed'
    ) THEN
        RAISE NOTICE '✅ Listing correctly marked as deleted';
    ELSE
        RAISE EXCEPTION '❌ Listing was not marked as deleted correctly';
    END IF;

    -- Verify it's in retention schedule
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'listing'
        AND entity_id = v_test_listing_id::TEXT
        AND action = 'delete'
        AND reason = 'user_deleted'
        AND initiated_by = v_user_id
        AND processed_at IS NULL
    ) THEN
        RAISE NOTICE '✅ Listing scheduled for deletion in retention_schedule';
    ELSE
        RAISE EXCEPTION '❌ Listing not found in retention_schedule';
    END IF;

    -- Clean up
    DELETE FROM retention_schedule WHERE entity_id = v_test_listing_id::TEXT;
    DELETE FROM trade_listings WHERE id = v_test_listing_id;

    RAISE NOTICE '✅ Test delete_listing PASSED';
END $$;

-- Test 3: Test delete_template function
DO $$
DECLARE
    v_test_template_id BIGINT;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'SKIPPED: Not authenticated. Please log in to test delete_template.';
        RETURN;
    END IF;

    -- Create a test template (low rating, should be deleted)
    INSERT INTO collection_templates (author_id, title, description, is_public, rating_avg, rating_count)
    VALUES (v_user_id, 'TEST TEMPLATE - DELETE ME', 'Test description', false, 0.0, 0)
    RETURNING id INTO v_test_template_id;

    RAISE NOTICE 'Created test template with ID: %', v_test_template_id;

    -- Delete it
    SELECT delete_template(v_test_template_id) INTO v_result;

    RAISE NOTICE 'Delete result: %', v_result;

    -- Verify it was marked as deleted
    IF EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_test_template_id
        AND deleted_at IS NOT NULL
        AND deleted_by = v_user_id
        AND deletion_type = 'user'
        AND is_public = FALSE
    ) THEN
        RAISE NOTICE '✅ Template correctly marked as deleted';
    ELSE
        RAISE EXCEPTION '❌ Template was not marked as deleted correctly';
    END IF;

    -- Verify it's in retention schedule
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'template'
        AND entity_id = v_test_template_id::TEXT
    ) THEN
        RAISE NOTICE '✅ Template scheduled for deletion in retention_schedule';
    ELSE
        RAISE EXCEPTION '❌ Template not found in retention_schedule';
    END IF;

    -- Clean up
    DELETE FROM retention_schedule WHERE entity_id = v_test_template_id::TEXT;
    DELETE FROM collection_templates WHERE id = v_test_template_id;

    RAISE NOTICE '✅ Test delete_template (normal) PASSED';
END $$;

-- Test 4: Test delete_template with high rating (archive behavior)
DO $$
DECLARE
    v_test_template_id BIGINT;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'SKIPPED: Not authenticated.';
        RETURN;
    END IF;

    -- Create a highly-rated public template
    INSERT INTO collection_templates (
        author_id,
        title,
        description,
        is_public,
        rating_avg,
        rating_count
    )
    VALUES (
        v_user_id,
        'TEST HIGHLY RATED TEMPLATE - DELETE ME',
        'Test description',
        true,
        4.5,  -- High rating
        15    -- Enough ratings
    )
    RETURNING id INTO v_test_template_id;

    RAISE NOTICE 'Created highly-rated template with ID: %', v_test_template_id;

    -- Try to delete it (should be archived instead)
    SELECT delete_template(v_test_template_id) INTO v_result;

    RAISE NOTICE 'Delete result: %', v_result;

    -- Verify it was ARCHIVED (not deleted)
    IF EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_test_template_id
        AND author_id IS NULL  -- Anonymized
        AND is_public = TRUE   -- Still public
        AND deleted_at IS NULL -- NOT deleted
    ) THEN
        RAISE NOTICE '✅ Template correctly ARCHIVED (not deleted)';
    ELSE
        RAISE EXCEPTION '❌ Template was not archived correctly';
    END IF;

    -- Verify it's NOT in retention schedule
    IF NOT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'template'
        AND entity_id = v_test_template_id::TEXT
    ) THEN
        RAISE NOTICE '✅ Archived template NOT scheduled for deletion';
    ELSE
        RAISE EXCEPTION '❌ Archived template should not be in retention schedule';
    END IF;

    -- Clean up
    DELETE FROM collection_templates WHERE id = v_test_template_id;

    RAISE NOTICE '✅ Test delete_template (archive) PASSED';
END $$;

-- Test 5: Test delete_account and cancel_account_deletion
-- WARNING: This will mark your account as deleted!
-- Only run this if you're using a test account
/*
DO $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    SELECT auth.uid() INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'SKIPPED: Not authenticated.';
        RETURN;
    END IF;

    RAISE NOTICE 'WARNING: This will mark your account as deleted (recoverable). Continue? Press Ctrl+C to cancel.';

    -- Delete account
    SELECT delete_account() INTO v_result;
    RAISE NOTICE 'Delete account result: %', v_result;

    -- Verify account is marked as deleted
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_user_id
        AND deleted_at IS NOT NULL
        AND is_suspended = TRUE
        AND deletion_reason = 'user_requested'
    ) THEN
        RAISE NOTICE '✅ Account correctly marked as deleted';
    ELSE
        RAISE EXCEPTION '❌ Account not marked as deleted';
    END IF;

    -- Verify scheduled for deletion
    IF EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_user_id::TEXT
        AND reason = 'user_requested'
    ) THEN
        RAISE NOTICE '✅ Account scheduled for deletion';
    ELSE
        RAISE EXCEPTION '❌ Account not scheduled for deletion';
    END IF;

    -- Cancel deletion
    SELECT cancel_account_deletion() INTO v_result;
    RAISE NOTICE 'Cancel result: %', v_result;

    -- Verify account is restored
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_user_id
        AND deleted_at IS NULL
        AND is_suspended = FALSE
    ) THEN
        RAISE NOTICE '✅ Account correctly restored';
    ELSE
        RAISE EXCEPTION '❌ Account not restored';
    END IF;

    -- Verify removed from retention schedule
    IF NOT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_type = 'user'
        AND entity_id = v_user_id::TEXT
        AND processed_at IS NULL
    ) THEN
        RAISE NOTICE '✅ Account removed from retention schedule';
    ELSE
        RAISE EXCEPTION '❌ Account still in retention schedule';
    END IF;

    RAISE NOTICE '✅ Test delete_account and cancel_account_deletion PASSED';
END $$;
*/

-- =====================================================
-- PERMISSION TESTS
-- =====================================================

-- Test 6: Try to delete someone else's listing (should fail)
-- Uncomment to test permission checks
/*
DO $$
DECLARE
    v_other_listing_id BIGINT;
BEGIN
    -- Find a listing that doesn't belong to current user
    SELECT id INTO v_other_listing_id
    FROM trade_listings
    WHERE user_id != auth.uid()
    LIMIT 1;

    IF v_other_listing_id IS NULL THEN
        RAISE NOTICE 'SKIPPED: No other user listings found';
        RETURN;
    END IF;

    BEGIN
        PERFORM delete_listing(v_other_listing_id);
        RAISE EXCEPTION '❌ Should have failed with permission denied!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Permission denied%' THEN
                RAISE NOTICE '✅ Permission check working correctly';
            ELSE
                RAISE EXCEPTION 'Wrong error: %', SQLERRM;
            END IF;
    END;
END $$;
*/

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 'Phase 2 validation complete!' as result;
SELECT 'All user deletion functions are ready to use' as status;
