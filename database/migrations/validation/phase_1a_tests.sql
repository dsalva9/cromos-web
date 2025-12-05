-- =====================================================
-- PHASE 1A VALIDATION TESTS
-- =====================================================
-- Run these tests AFTER applying migration 20251205143407
-- =====================================================

-- Test 1: Verify foreign key constraint was updated
SELECT
    con.conname AS constraint_name,
    CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete,
    CASE con.confupdtype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_update
FROM pg_constraint con
WHERE con.conrelid = 'user_template_copies'::regclass
AND con.contype = 'f'
AND con.conname = 'user_template_copies_template_id_fkey';

-- ✅ Expected: on_delete = 'SET NULL', on_update = 'NO ACTION'

-- Test 2: Verify template_id is now nullable
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_template_copies'
AND column_name IN ('template_id', 'is_orphaned');

-- ✅ Expected: template_id is_nullable = 'YES', is_orphaned exists

-- Test 3: Verify is_orphaned column exists and is computed
SELECT
    column_name,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'user_template_copies'
AND column_name = 'is_orphaned';

-- ✅ Expected: is_generated = 'ALWAYS'

-- Test 4: Verify index for orphaned albums was created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_template_copies'
AND indexname = 'idx_user_template_copies_orphaned';

-- ✅ Expected: 1 row with WHERE clause for template_id IS NULL

-- =====================================================
-- FUNCTIONAL TESTS (Create, Update, Delete)
-- =====================================================

-- Test 5: Create test template and album
DO $$
DECLARE
    v_template_id BIGINT;
    v_copy_id BIGINT;
    v_user_id UUID;
BEGIN
    -- Get current user ID (or use a test user)
    SELECT auth.uid() INTO v_user_id;

    -- Create test template
    INSERT INTO collection_templates (author_id, title, is_public)
    VALUES (v_user_id, 'TEST TEMPLATE - DELETE ME', true)
    RETURNING id INTO v_template_id;

    RAISE NOTICE 'Created test template with ID: %', v_template_id;

    -- Copy it as album
    INSERT INTO user_template_copies (user_id, template_id, title, is_active)
    VALUES (v_user_id, v_template_id, 'TEST ALBUM - DELETE ME', true)
    RETURNING id INTO v_copy_id;

    RAISE NOTICE 'Created test album with ID: %', v_copy_id;

    -- Verify initial state
    RAISE NOTICE '=== Initial State ===';
    RAISE NOTICE 'Album template_id: %, is_orphaned: %',
        (SELECT template_id FROM user_template_copies WHERE id = v_copy_id),
        (SELECT is_orphaned FROM user_template_copies WHERE id = v_copy_id);

    -- Update the template (simulate author editing)
    UPDATE collection_templates
    SET title = 'TEST TEMPLATE v2 - UPDATED'
    WHERE id = v_template_id;

    -- Verify album is NOT affected by template update
    RAISE NOTICE '=== After Template Update ===';
    RAISE NOTICE 'Album title: % (should still be "TEST ALBUM - DELETE ME")',
        (SELECT title FROM user_template_copies WHERE id = v_copy_id);
    RAISE NOTICE 'Template_id: %, is_orphaned: %',
        (SELECT template_id FROM user_template_copies WHERE id = v_copy_id),
        (SELECT is_orphaned FROM user_template_copies WHERE id = v_copy_id);

    -- Delete the template
    DELETE FROM collection_templates WHERE id = v_template_id;

    -- Verify album still exists as orphaned
    RAISE NOTICE '=== After Template Deletion ===';
    IF EXISTS (SELECT 1 FROM user_template_copies WHERE id = v_copy_id) THEN
        RAISE NOTICE 'Album still exists! ✅';
        RAISE NOTICE 'Template_id: %, is_orphaned: %',
            (SELECT template_id FROM user_template_copies WHERE id = v_copy_id),
            (SELECT is_orphaned FROM user_template_copies WHERE id = v_copy_id);

        -- ✅ Expected: template_id = NULL, is_orphaned = TRUE
        IF (SELECT template_id IS NULL AND is_orphaned = TRUE FROM user_template_copies WHERE id = v_copy_id) THEN
            RAISE NOTICE 'Album is correctly orphaned! ✅';
        ELSE
            RAISE EXCEPTION 'Album is NOT correctly orphaned! ❌';
        END IF;
    ELSE
        RAISE EXCEPTION 'Album was deleted when template was deleted! ❌';
    END IF;

    -- Clean up
    DELETE FROM user_template_copies WHERE id = v_copy_id;
    RAISE NOTICE 'Cleanup complete';
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- If you see "Album is correctly orphaned! ✅" above, Phase 1A is working!
-- =====================================================
