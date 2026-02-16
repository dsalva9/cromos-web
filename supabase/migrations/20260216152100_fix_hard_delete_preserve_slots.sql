-- Migration: IP-Safe Template Deletion — Fix Hard Delete Functions
--
-- Problem: admin_permanently_delete_template, admin_permanently_delete_user, 
-- and admin_purge_user explicitly DELETE template_slots and template_pages.
-- With the safety net FK (SET NULL), this is no longer catastrophic, but it 
-- orphans slot references that user_template_progress still points to.
--
-- Fix: Only delete slots/pages when no other users have álbumes (copies) 
-- that reference the template.
--
-- Also adds original_template_id to user_template_copies for traceability.

---------------------------------------------------------------
-- Step 1: Add original_template_id column + backfill + trigger
---------------------------------------------------------------

ALTER TABLE user_template_copies
ADD COLUMN IF NOT EXISTS original_template_id BIGINT;

-- Backfill from existing data
UPDATE user_template_copies
SET original_template_id = template_id
WHERE original_template_id IS NULL AND template_id IS NOT NULL;

-- Trigger to auto-populate on INSERT
CREATE OR REPLACE FUNCTION set_original_template_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.original_template_id IS NULL THEN
        NEW.original_template_id := NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_original_template_id ON user_template_copies;
CREATE TRIGGER trg_set_original_template_id
BEFORE INSERT ON user_template_copies
FOR EACH ROW
EXECUTE FUNCTION set_original_template_id();

---------------------------------------------------------------
-- Step 2: Fix admin_permanently_delete_template
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."admin_permanently_delete_template"("p_template_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
    v_template_title TEXT;
    v_is_on_legal_hold BOOLEAN;
    v_deleted_slot_count INTEGER;
    v_deleted_page_count INTEGER;
    v_deleted_rating_count INTEGER;
    v_copy_count INTEGER;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete templates';
    END IF;

    -- Check if template exists
    IF NOT EXISTS (SELECT 1 FROM collection_templates WHERE id = p_template_id) THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Get template info for logging
    SELECT title INTO v_template_title
    FROM collection_templates
    WHERE id = p_template_id;

    -- Check for legal hold
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_template_id::TEXT
            AND entity_type = 'template'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete template % - currently on legal hold', v_template_title;
    END IF;

    -- Count related data for response
    SELECT COUNT(*) INTO v_deleted_slot_count
    FROM template_slots WHERE template_id = p_template_id;

    SELECT COUNT(*) INTO v_deleted_page_count
    FROM template_pages WHERE template_id = p_template_id;

    SELECT COUNT(*) INTO v_deleted_rating_count
    FROM template_ratings WHERE template_id = p_template_id;

    -- Count user copies
    SELECT COUNT(*) INTO v_copy_count
    FROM user_template_copies WHERE template_id = p_template_id;

    -- Log action BEFORE deletion
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
        'moderation',
        p_template_id,
        'moderation',
        v_admin_id,
        'permanent_delete_template',
        'template',
        p_template_id,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'template_id', p_template_id,
            'title', v_template_title,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW(),
            'active_copies', v_copy_count
        ),
        NOW()
    );

    -- Delete from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_id = p_template_id::TEXT
        AND entity_type = 'template';

    -- Always safe to delete: ratings and reports
    DELETE FROM template_ratings WHERE template_id = p_template_id;
    DELETE FROM reports WHERE target_type = 'template' AND target_id = p_template_id;

    -- Only delete structural data (slots/pages) if NO users have copies.
    -- If users have copies, slots/pages must survive so user_template_progress
    -- can still reference them via slot_id FK.
    IF v_copy_count = 0 THEN
        DELETE FROM template_slots WHERE template_id = p_template_id;
        DELETE FROM template_pages WHERE template_id = p_template_id;
    END IF;

    -- Delete the template itself.
    -- FK behavior:
    --   user_template_copies.template_id → SET NULL (álbumes become orphaned)
    --   template_slots.template_id → SET NULL (slots preserved but unlinked)
    --   template_pages.template_id → SET NULL (pages preserved but unlinked)
    DELETE FROM collection_templates WHERE id = p_template_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Template permanently deleted',
        'template_id', p_template_id,
        'title', v_template_title,
        'deleted_slot_count', v_deleted_slot_count,
        'deleted_page_count', v_deleted_page_count,
        'deleted_rating_count', v_deleted_rating_count,
        'orphaned_copies', v_copy_count,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;

---------------------------------------------------------------
-- Step 3: Fix admin_permanently_delete_user
---------------------------------------------------------------
-- Same issue: when deleting a user, their authored templates' slots/pages
-- are explicitly deleted. If other users have copies of those templates,
-- the slot references in user_template_progress break.
-- Fix: only delete slots/pages for templates with no copies from OTHER users.

CREATE OR REPLACE FUNCTION "public"."admin_permanently_delete_user"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_admin_id UUID;
    v_user_nickname TEXT;
    v_user_email TEXT;
    v_is_on_legal_hold BOOLEAN;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete users';
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get user info for logging
    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = p_user_id;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Check for legal hold
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_user_id::TEXT
            AND entity_type = 'user'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete user % - currently on legal hold', v_user_nickname;
    END IF;

    -- Log action BEFORE deletion
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
        NULL,
        'moderation',
        v_admin_id,
        p_user_id,
        'permanent_delete_user',
        'user',
        NULL,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'email', v_user_email,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW()
        ),
        NOW()
    );

    -- Delete from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_id = p_user_id::TEXT
        AND entity_type = 'user';

    -- Cascade delete user data (in order)
    -- XP and badges
    DELETE FROM xp_history WHERE user_id = p_user_id;
    DELETE FROM user_badge_progress WHERE user_id = p_user_id;
    DELETE FROM user_badges WHERE user_id = p_user_id;

    -- Notifications
    DELETE FROM notifications WHERE user_id = p_user_id;

    -- Trades (chats, proposals, listings)
    DELETE FROM trade_reads WHERE user_id = p_user_id;
    DELETE FROM trade_finalizations WHERE user_id = p_user_id;

    -- Delete trade chats where user is involved
    DELETE FROM trade_chats WHERE listing_id IN (
        SELECT id FROM trade_listings WHERE user_id = p_user_id
    );
    DELETE FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id;

    -- Delete trade proposals
    DELETE FROM trade_proposal_items WHERE proposal_id IN (
        SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
    );
    DELETE FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id;

    -- Delete listings
    DELETE FROM listing_transactions WHERE listing_id IN (
        SELECT id FROM trade_listings WHERE user_id = p_user_id
    );
    DELETE FROM trade_listings WHERE user_id = p_user_id;

    -- Templates and progress
    DELETE FROM user_template_progress WHERE user_id = p_user_id;
    DELETE FROM user_template_copies WHERE user_id = p_user_id;

    -- Delete owned templates: only delete slots/pages for templates
    -- that have NO copies from OTHER users. The FK SET NULL on 
    -- collection_templates will handle the rest safely.
    DELETE FROM template_slots WHERE template_id IN (
        SELECT ct.id FROM collection_templates ct
        WHERE ct.author_id = p_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_template_copies utc
              WHERE utc.template_id = ct.id
          )
    );
    DELETE FROM template_pages WHERE template_id IN (
        SELECT ct.id FROM collection_templates ct
        WHERE ct.author_id = p_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_template_copies utc
              WHERE utc.template_id = ct.id
          )
    );
    DELETE FROM template_ratings WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );
    DELETE FROM collection_templates WHERE author_id = p_user_id;

    -- User interactions
    DELETE FROM user_ratings WHERE rater_id = p_user_id OR rated_id = p_user_id;
    DELETE FROM favourites WHERE user_id = p_user_id;
    DELETE FROM reports WHERE reporter_id = p_user_id;
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;

    -- Finally delete profile (audit_log.user_id will be SET NULL via FK)
    DELETE FROM profiles WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'user_id', p_user_id,
        'nickname', v_user_nickname,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;
