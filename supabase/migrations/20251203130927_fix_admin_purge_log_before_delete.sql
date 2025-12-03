-- Fix admin_purge_user to log audit entry BEFORE deleting profile
-- The audit_log.user_id has a FK to profiles, so we must log before deletion

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

    -- Delete in order to respect foreign key constraints

    DELETE FROM xp_history WHERE user_id = p_user_id;
    DELETE FROM user_badge_progress WHERE user_id = p_user_id;
    DELETE FROM user_badges WHERE user_id = p_user_id;
    DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;
    DELETE FROM trade_reads WHERE user_id = p_user_id;
    DELETE FROM trade_finalizations WHERE user_id = p_user_id;

    DELETE FROM trades_history WHERE trade_id IN (
        SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
    );

    DELETE FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id;
    DELETE FROM trade_listings WHERE user_id = p_user_id;

    DELETE FROM trade_proposal_items WHERE proposal_id IN (
        SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
    );

    DELETE FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id;
    DELETE FROM user_template_progress WHERE user_id = p_user_id;
    DELETE FROM user_template_copies WHERE user_id = p_user_id;

    DELETE FROM template_slots WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );

    DELETE FROM template_pages WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );

    DELETE FROM template_ratings WHERE user_id = p_user_id OR template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );

    DELETE FROM collection_templates WHERE author_id = p_user_id;
    DELETE FROM user_ratings WHERE rater_id = p_user_id OR rated_id = p_user_id;
    DELETE FROM favourites WHERE user_id = p_user_id;
    DELETE FROM reports WHERE reporter_id = p_user_id;
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;
    DELETE FROM audit_log WHERE user_id = p_user_id;

    -- LOG THE PURGE ACTION BEFORE DELETING THE PROFILE
    -- This is critical because audit_log.user_id has FK to profiles
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
        'moderation',
        'purge_user',
        'user',
        'User data purged by admin',
        jsonb_build_object('purged_at', NOW(), 'purged_by', v_admin_id),
        NOW()
    );

    -- NOW delete the profile (after logging)
    DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_purge_user(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION admin_purge_user(UUID, UUID) IS
'Purges all user data from the database. Requires admin permissions. Can be called with service role by providing admin_id. Logs audit entry before deleting profile due to FK constraint.';
