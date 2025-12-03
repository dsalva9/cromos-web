-- Fix admin_purge_user deletion order to avoid trigger conflicts
-- Move trade_chats deletion AFTER trade_listings deletion
-- Disable triggers temporarily during deletion to avoid issues

CREATE OR REPLACE FUNCTION admin_purge_user(
    p_user_id UUID,
    p_admin_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Use provided admin_id or fall back to auth.uid()
    v_admin_id := COALESCE(p_admin_id, auth.uid());

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin ID required';
    END IF;

    -- Validate admin permission
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_admin_id AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions. Admin access required.';
    END IF;

    -- Temporarily disable triggers on trade_listings to avoid conflicts
    -- This prevents the notify_listing_status_change trigger from trying to create
    -- chat messages when we're deleting the listing
    ALTER TABLE trade_listings DISABLE TRIGGER ALL;

    BEGIN
        -- Delete in order to respect foreign key constraints

        -- 1. Delete XP history
        DELETE FROM xp_history WHERE user_id = p_user_id;

        -- 2. Delete badge progress
        DELETE FROM user_badge_progress WHERE user_id = p_user_id;

        -- 3. Delete user badges
        DELETE FROM user_badges WHERE user_id = p_user_id;

        -- 4. Delete notifications
        DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;

        -- 5. Delete trade reads
        DELETE FROM trade_reads WHERE user_id = p_user_id;

        -- 6. Delete trade finalizations
        DELETE FROM trade_finalizations WHERE user_id = p_user_id;

        -- 7. Delete trades history
        DELETE FROM trades_history WHERE trade_id IN (
            SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
        );

        -- 8. Delete trade proposal items (before trade_proposals)
        DELETE FROM trade_proposal_items WHERE proposal_id IN (
            SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
        );

        -- 9. Delete trade proposals (before trade_chats since chats reference proposals)
        DELETE FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id;

        -- 10. Delete listing transactions
        DELETE FROM listing_transactions WHERE buyer_id = p_user_id OR seller_id = p_user_id;

        -- 11. Delete trade listings (BEFORE trade_chats to avoid trigger issues)
        DELETE FROM trade_listings WHERE user_id = p_user_id;

        -- 12. NOW delete trade chats (after listings and proposals are gone)
        DELETE FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id;

        -- 13. Delete user template progress
        DELETE FROM user_template_progress WHERE user_id = p_user_id;

        -- 14. Delete user template copies
        DELETE FROM user_template_copies WHERE user_id = p_user_id;

        -- 15. Delete template slots (for templates authored by user)
        DELETE FROM template_slots WHERE template_id IN (
            SELECT id FROM collection_templates WHERE author_id = p_user_id
        );

        -- 16. Delete template pages (for templates authored by user)
        DELETE FROM template_pages WHERE template_id IN (
            SELECT id FROM collection_templates WHERE author_id = p_user_id
        );

        -- 17. Delete template ratings (given and received)
        DELETE FROM template_ratings WHERE user_id = p_user_id OR template_id IN (
            SELECT id FROM collection_templates WHERE author_id = p_user_id
        );

        -- 18. Delete collection templates authored by user
        DELETE FROM collection_templates WHERE author_id = p_user_id;

        -- 19. Delete user ratings (both given and received)
        DELETE FROM user_ratings WHERE rater_id = p_user_id OR rated_id = p_user_id;

        -- 20. Delete favourites
        DELETE FROM favourites WHERE user_id = p_user_id;

        -- 21. Delete reports (made by user or about user)
        DELETE FROM reports WHERE reporter_id = p_user_id;

        -- 22. Delete ignored user records
        DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;

        -- 23. Delete audit log entries (keep admin actions by this user for accountability)
        DELETE FROM audit_log WHERE user_id = p_user_id;

        -- 24. Finally, delete user's profile
        DELETE FROM profiles WHERE id = p_user_id;

        -- Re-enable triggers
        ALTER TABLE trade_listings ENABLE TRIGGER ALL;

        -- Log the purge action
        INSERT INTO audit_log (
            user_id,
            admin_id,
            entity,
            entity_type,
            action,
            moderation_action_type,
            moderated_entity_type,
            moderation_reason,
            new_values,
            occurred_at
        ) VALUES (
            p_user_id,
            v_admin_id,
            'user',
            'user',
            'purge',
            'purge_user',
            'user',
            'User data purged by admin',
            jsonb_build_object('purged_at', NOW(), 'purged_by', v_admin_id),
            NOW()
        );

    EXCEPTION
        WHEN OTHERS THEN
            -- Re-enable triggers even on error
            ALTER TABLE trade_listings ENABLE TRIGGER ALL;
            RAISE;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_purge_user(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_purge_user(UUID, UUID) IS
'Purges all user data from the database. Requires admin permissions. Can be called with service role by providing admin_id. Temporarily disables triggers during deletion to avoid conflicts.';
