-- =====================================================
-- ADMIN: User Purge Function
-- =====================================================
-- Purpose: Safely delete all user data when an admin deletes a user
-- =====================================================

CREATE OR REPLACE FUNCTION admin_purge_user(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    -- Delete user's marketplace listings
    DELETE FROM marketplace_listings WHERE seller_id = p_user_id;

    -- Delete user's templates (this will cascade to pages and slots)
    DELETE FROM collection_templates WHERE author_id = p_user_id;

    -- Delete user's collections (this will cascade to slots and pages)
    DELETE FROM collections WHERE user_id = p_user_id;

    -- Delete user's ratings
    DELETE FROM template_ratings WHERE user_id = p_user_id;

    -- Delete user's favourites
    DELETE FROM favourites WHERE user_id = p_user_id;

    -- Delete user's marketplace transactions
    DELETE FROM marketplace_transactions WHERE buyer_id = p_user_id OR seller_id = p_user_id;

    -- Delete user's trade offers
    DELETE FROM trade_offers WHERE sender_id = p_user_id OR receiver_id = p_user_id;

    -- Delete user's messages
    DELETE FROM messages WHERE sender_id = p_user_id OR recipient_id = p_user_id;

    -- Delete user's profile (this should be last)
    DELETE FROM profiles WHERE id = p_user_id;

    -- Log the purge
    INSERT INTO audit_log (
        action_type,
        performed_by,
        target_type,
        target_id,
        metadata
    ) VALUES (
        'user_purge',
        auth.uid(),
        'user',
        p_user_id,
        jsonb_build_object('purged_at', NOW())
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION admin_purge_user TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_purge_user IS 'Safely deletes all user data (admin only)';
