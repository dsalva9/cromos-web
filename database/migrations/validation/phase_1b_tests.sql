-- =====================================================
-- PHASE 1B VALIDATION TESTS
-- =====================================================
-- Run these tests AFTER applying migration 20251205143910
-- =====================================================

-- Test 1: Verify retention_schedule table created
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'retention_schedule';

-- ✅ Expected: 1 row, table_type = 'BASE TABLE'

-- Test 2: Verify retention_schedule has all required columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'retention_schedule'
ORDER BY ordinal_position;

-- ✅ Expected: 10 columns (id, entity_type, entity_id, action, scheduled_for, reason,
--              legal_hold_until, initiated_by, initiated_by_type, created_at, processed_at)

-- Test 3: Verify retention_schedule constraints
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
WHERE con.conrelid = 'retention_schedule'::regclass
AND con.contype IN ('c', 'u')  -- Check and Unique constraints
ORDER BY constraint_name;

-- ✅ Expected: Multiple constraints including entity_type CHECK, action CHECK, unique_entity_schedule

-- Test 4: Verify retention_schedule indices created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'retention_schedule'
ORDER BY indexname;

-- ✅ Expected: At least 4 indices (pending, entity, legal_hold, initiated_by)

-- Test 5: Verify deletion columns added to trade_listings
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trade_listings'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type')
ORDER BY column_name;

-- ✅ Expected: 3 rows

-- Test 6: Verify deletion columns added to collection_templates
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'collection_templates'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type')
ORDER BY column_name;

-- ✅ Expected: 3 rows

-- Test 7: Verify suspension/deletion columns added to profiles
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('deleted_at', 'suspended_at', 'suspended_by', 'suspension_reason', 'deletion_reason')
ORDER BY column_name;

-- ✅ Expected: 5 rows

-- Test 8: Verify indices on existing tables
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('trade_listings', 'collection_templates', 'profiles')
AND indexname IN (
    'idx_listings_not_deleted',
    'idx_templates_not_deleted',
    'idx_profiles_not_deleted',
    'idx_profiles_suspended'
)
ORDER BY tablename, indexname;

-- ✅ Expected: 4 rows (one index for each table)

-- =====================================================
-- FUNCTIONAL TESTS
-- =====================================================

-- Test 9: Test retention_schedule constraints work
DO $$
BEGIN
    -- Try to insert invalid entity_type (should fail)
    BEGIN
        INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
        VALUES ('invalid', '1', 'delete', NOW(), 'test');
        RAISE EXCEPTION 'Should have failed with invalid entity_type!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ Invalid entity_type correctly rejected';
    END;

    -- Try to insert invalid action (should fail)
    BEGIN
        INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
        VALUES ('listing', '1', 'invalid_action', NOW(), 'test');
        RAISE EXCEPTION 'Should have failed with invalid action!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ Invalid action correctly rejected';
    END;

    -- Insert valid row (should succeed)
    INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
    VALUES ('listing', '999999', 'delete', NOW() + INTERVAL '90 days', 'test_valid');

    RAISE NOTICE '✅ Valid row inserted successfully';

    -- Try to insert duplicate (should fail due to unique constraint)
    BEGIN
        INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
        VALUES ('listing', '999999', 'delete', NOW() + INTERVAL '90 days', 'test_duplicate');
        RAISE EXCEPTION 'Should have failed with duplicate key!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '✅ Duplicate correctly rejected';
    END;

    -- Clean up
    DELETE FROM retention_schedule WHERE entity_id = '999999';
    RAISE NOTICE '✅ Cleanup complete';
END $$;

-- Test 10: Test deletion_type constraints on listings and templates
DO $$
BEGIN
    -- Try invalid deletion_type on listings (should fail)
    BEGIN
        INSERT INTO trade_listings (user_id, title, status, deletion_type)
        SELECT id, 'Test', 'active', 'invalid'
        FROM profiles
        LIMIT 1;
        RAISE EXCEPTION 'Should have failed with invalid deletion_type!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ Invalid deletion_type on listings correctly rejected';
    END;

    -- Try invalid deletion_type on templates (should fail)
    BEGIN
        INSERT INTO collection_templates (author_id, title, deletion_type)
        SELECT id, 'Test', 'invalid'
        FROM profiles
        LIMIT 1;
        RAISE EXCEPTION 'Should have failed with invalid deletion_type!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ Invalid deletion_type on templates correctly rejected';
    END;

    RAISE NOTICE '✅ All deletion_type constraints working';
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- If all tests show ✅, Phase 1B is complete!
-- =====================================================

-- Final count: Show what we created
SELECT
    'retention_schedule' as object_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_name = 'retention_schedule'
UNION ALL
SELECT
    'retention_schedule indices',
    COUNT(*)
FROM pg_indexes
WHERE tablename = 'retention_schedule'
UNION ALL
SELECT
    'deletion columns on listings',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'trade_listings'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type')
UNION ALL
SELECT
    'deletion columns on templates',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'collection_templates'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type')
UNION ALL
SELECT
    'suspension/deletion columns on profiles',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('deleted_at', 'suspended_at', 'suspended_by', 'suspension_reason', 'deletion_reason');
