-- Fix admin_purge_user to accept admin_id parameter
-- This allows it to be called with service role client

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

    -- Delete user's chats FIRST (before trade_offers to avoid constraint violations)
    DELETE FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id;

    -- Delete user's trade offers (after chats)
    DELETE FROM trade_offers WHERE sender_id = p_user_id OR receiver_id = p_user_id;

    -- Delete user's trade listings
    DELETE FROM trade_listings WHERE user_id = p_user_id;

    -- Delete user's templates (this will cascade to pages and slots)
    DELETE FROM collection_templates WHERE author_id = p_user_id;

    -- Delete user's collections (this will cascade to slots and pages)
    DELETE FROM collections WHERE user_id = p_user_id;

    -- Delete user's ratings (both given and received)
    DELETE FROM template_ratings WHERE user_id = p_user_id;
    DELETE FROM user_ratings WHERE rated_user_id = p_user_id OR rating_user_id = p_user_id;

    -- Delete user's favourites
    DELETE FROM favourites WHERE user_id = p_user_id;

    -- Delete user's listing transactions
    DELETE FROM listing_transactions WHERE buyer_id = p_user_id OR seller_id = p_user_id;

    -- Delete user's messages
    DELETE FROM messages WHERE sender_id = p_user_id OR recipient_id = p_user_id;

    -- Delete ignored user records
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;

    -- Delete notification preferences
    DELETE FROM notification_preferences WHERE user_id = p_user_id;

    -- Delete user's profile (this should be last)
    DELETE FROM profiles WHERE id = p_user_id;

    -- Log the purge with the admin_id
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
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_purge_user(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_purge_user(UUID, UUID) IS
'Purges all user data from the database. Requires admin permissions. Can be called with service role by providing admin_id.';
