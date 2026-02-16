-- =====================================================
-- IP-SAFE TEMPLATE DELETION VERIFICATION TEST
-- =====================================================
-- Tests the full lifecycle: create template → create album → 
-- hard delete template → verify album + progress survive
-- =====================================================

DO $$
DECLARE
    v_template_id BIGINT;
    v_page_id BIGINT;
    v_slot_id BIGINT;
    v_user_id UUID;
    v_copy_id BIGINT;
    v_progress_count INTEGER;
    v_slot_exists BOOLEAN;
    v_copy_exists BOOLEAN;
    v_copy_orphaned BOOLEAN;
    v_original_tid BIGINT;
    v_slot_template_id BIGINT;
BEGIN
    -- ============================================
    -- SETUP: Create test data
    -- ============================================
    
    -- Create a test user profile
    v_user_id := 'a0000000-0000-0000-0000-000000000001'::UUID;
    
    INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new)
    VALUES (v_user_id, 'test-template-deletion@test.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '', '', '')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, nickname, is_admin)
    VALUES (v_user_id, 'TestDeleteUser', true)
    ON CONFLICT (id) DO UPDATE SET is_admin = true;

    -- Create a test coleccion (template)
    INSERT INTO collection_templates (author_id, title, is_public)
    VALUES (v_user_id, 'TEST PANINI TAKEDOWN', true)
    RETURNING id INTO v_template_id;
    
    RAISE NOTICE '✅ Created coleccion (template) ID: %', v_template_id;

    -- Create a page
    INSERT INTO template_pages (template_id, title, page_number, slots_count)
    VALUES (v_template_id, 'Equipo A', 1, 1)
    RETURNING id INTO v_page_id;

    -- Create a slot
    INSERT INTO template_slots (template_id, page_id, slot_number, label)
    VALUES (v_template_id, v_page_id, 1, 'Cromo 1')
    RETURNING id INTO v_slot_id;

    RAISE NOTICE '✅ Created page ID: %, slot ID: %', v_page_id, v_slot_id;

    -- Create an album (copy)
    INSERT INTO user_template_copies (user_id, template_id, title, is_active)
    VALUES (v_user_id, v_template_id, 'TEST PANINI TAKEDOWN', true)
    RETURNING id INTO v_copy_id;

    RAISE NOTICE '✅ Created album (copy) ID: %', v_copy_id;

    -- ============================================
    -- TEST 1: original_template_id trigger
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 1: original_template_id trigger ===';
    
    SELECT original_template_id INTO v_original_tid
    FROM user_template_copies WHERE id = v_copy_id;
    
    IF v_original_tid = v_template_id THEN
        RAISE NOTICE '✅ PASS: original_template_id auto-set to %', v_original_tid;
    ELSE
        RAISE EXCEPTION '❌ FAIL: original_template_id expected %, got %', v_template_id, v_original_tid;
    END IF;

    -- Create sticker progress
    INSERT INTO user_template_progress (user_id, copy_id, slot_id, status, count)
    VALUES (v_user_id, v_copy_id, v_slot_id, 'missing', 0);

    RAISE NOTICE '✅ Created sticker progress for slot %', v_slot_id;

    -- ============================================
    -- TEST 2: Hard delete the template
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 2: Hard delete coleccion ===';
    
    -- Delete ratings first (if any), then the template
    DELETE FROM template_ratings WHERE template_id = v_template_id;
    DELETE FROM collection_templates WHERE id = v_template_id;
    
    RAISE NOTICE '  Deleted collection_templates row';

    -- ============================================
    -- TEST 3: Album survived and is orphaned
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 3: Album survival check ===';
    
    SELECT EXISTS(SELECT 1 FROM user_template_copies WHERE id = v_copy_id) INTO v_copy_exists;
    SELECT is_orphaned INTO v_copy_orphaned FROM user_template_copies WHERE id = v_copy_id;
    
    IF v_copy_exists AND v_copy_orphaned THEN
        RAISE NOTICE '✅ PASS: Album exists and is_orphaned = true';
    ELSE
        RAISE EXCEPTION '❌ FAIL: Album gone or not orphaned! exists=%, orphaned=%', v_copy_exists, v_copy_orphaned;
    END IF;

    -- ============================================
    -- TEST 4: Slot survived (SET NULL FK)
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 4: Slot survival check ===';
    
    SELECT EXISTS(SELECT 1 FROM template_slots WHERE id = v_slot_id) INTO v_slot_exists;
    
    IF v_slot_exists THEN
        RAISE NOTICE '✅ PASS: Slot still exists after template deletion';
    ELSE
        RAISE EXCEPTION '❌ FAIL: Slot was deleted! Safety net FK not working!';
    END IF;

    -- Verify slot's template_id is now NULL
    SELECT template_id INTO v_slot_template_id FROM template_slots WHERE id = v_slot_id;
    IF v_slot_template_id IS NULL THEN
        RAISE NOTICE '✅ PASS: Slot template_id is NULL (SET NULL FK working)';
    ELSE
        RAISE EXCEPTION '❌ FAIL: Slot template_id should be NULL, got %', v_slot_template_id;
    END IF;

    -- ============================================
    -- TEST 5: User progress intact
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 5: User progress check ===';
    
    SELECT COUNT(*) INTO v_progress_count
    FROM user_template_progress WHERE copy_id = v_copy_id AND slot_id = v_slot_id;
    
    IF v_progress_count = 1 THEN
        RAISE NOTICE '✅ PASS: User sticker progress intact (% row)', v_progress_count;
    ELSE
        RAISE EXCEPTION '❌ FAIL: User progress lost! count=%', v_progress_count;
    END IF;

    -- ============================================
    -- TEST 6: original_template_id preserved
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 6: original_template_id preserved ===';
    
    SELECT original_template_id INTO v_original_tid
    FROM user_template_copies WHERE id = v_copy_id;
    
    IF v_original_tid = v_template_id THEN
        RAISE NOTICE '✅ PASS: original_template_id preserved: %', v_original_tid;
    ELSE
        RAISE EXCEPTION '❌ FAIL: original_template_id lost! Expected %, got %', v_template_id, v_original_tid;
    END IF;

    -- ============================================
    -- CLEANUP
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '=== CLEANUP ===';
    DELETE FROM user_template_progress WHERE copy_id = v_copy_id;
    DELETE FROM user_template_copies WHERE id = v_copy_id;
    DELETE FROM template_slots WHERE id = v_slot_id;
    DELETE FROM template_pages WHERE id = v_page_id;
    DELETE FROM profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE '✅ All test data cleaned up';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  ALL TESTS PASSED ✅';
    RAISE NOTICE '========================================';
END $$;
