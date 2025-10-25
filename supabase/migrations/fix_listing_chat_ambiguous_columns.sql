-- =====================================================
-- Fix Ambiguous Column References in get_listing_chats
-- =====================================================
-- Fix: Fully qualify all column names with table aliases
-- Apply this via Supabase Dashboard > SQL Editor
-- Date: 2025-10-25
-- =====================================================

-- Drop and recreate get_listing_chats with fixed column references
DROP FUNCTION IF EXISTS get_listing_chats CASCADE;

CREATE FUNCTION get_listing_chats(
    p_listing_id BIGINT,
    p_participant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    sender_id UUID,
    receiver_id UUID,
    sender_nickname TEXT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_listing_user_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get the listing owner
    SELECT tl.user_id INTO v_listing_user_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Determine access and filtering
    IF auth.uid() = v_listing_user_id THEN
        -- Seller viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific buyer conversation
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                p.nickname AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.created_at
            FROM trade_chats tc
            JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (tc.sender_id = p_participant_id OR tc.receiver_id = p_participant_id)
            ORDER BY tc.created_at ASC;
        ELSE
            -- Viewing all conversations
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                p.nickname AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.created_at
            FROM trade_chats tc
            JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            ORDER BY tc.created_at ASC;
        END IF;
    ELSE
        -- Buyer viewing own conversation with seller
        IF p_participant_id IS NOT NULL AND p_participant_id != v_listing_user_id THEN
            RAISE EXCEPTION 'You can only view your own conversation';
        END IF;

        RETURN QUERY
        SELECT
            tc.id,
            tc.sender_id,
            tc.receiver_id,
            p.nickname AS sender_nickname,
            tc.message,
            tc.is_read,
            tc.created_at
        FROM trade_chats tc
        JOIN profiles p ON tc.sender_id = p.id
        WHERE tc.listing_id = p_listing_id
        AND (tc.sender_id = auth.uid() OR tc.receiver_id = auth.uid())
        ORDER BY tc.created_at ASC;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_listing_chats(BIGINT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_listing_chats IS 'Get chat messages for a listing, optionally filtered by participant. Fixed ambiguous column references.';
