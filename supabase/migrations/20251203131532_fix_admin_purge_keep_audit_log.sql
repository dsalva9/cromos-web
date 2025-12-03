-- Fix admin_purge_user to preserve all audit log entries
-- Audit logs must be kept for accountability and compliance
-- Change FK constraint to SET NULL instead of CASCADE/RESTRICT

-- First, change the FK constraint on audit_log.user_id to SET NULL
ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;

ALTER TABLE audit_log
ADD CONSTRAINT audit_log_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE SET NULL;  -- Keep audit entries, just NULL the user_id

COMMENT ON CONSTRAINT audit_log_user_id_fkey ON audit_log IS
'FK to user. SET NULL on delete to preserve audit history.';

-- Do the same for admin_id to preserve who performed actions
ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_admin_id_fkey;

ALTER TABLE audit_log
ADD CONSTRAINT audit_log_admin_id_fkey
FOREIGN KEY (admin_id)
REFERENCES profiles(id)
ON DELETE SET NULL;  -- Keep audit entries, just NULL the admin_id

COMMENT ON CONSTRAINT audit_log_admin_id_fkey ON audit_log IS
'FK to admin. SET NULL on delete to preserve audit history.';

-- Update the function to NOT delete audit logs
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

    -- Delete user data in order to respect FK constraints

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

    -- DO NOT DELETE AUDIT LOGS - they must be preserved for accountability
    -- The FK constraint will SET NULL user_id when we delete the profile

    -- Log the purge action BEFORE deleting profile
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

    -- Delete the profile (audit logs will have user_id set to NULL by FK constraint)
    DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_purge_user(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION admin_purge_user(UUID, UUID) IS
'Purges all user data from the database except audit logs. Requires admin permissions. Preserves audit log entries for accountability.';
