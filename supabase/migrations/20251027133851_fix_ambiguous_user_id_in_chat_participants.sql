-- =====================================================
-- Fix ambiguous user_id in get_listing_chat_participants
-- =====================================================
-- Purpose: Fix "column reference 'user_id' is ambiguous" error
-- The issue is caused by the function selecting from trade_listings.user_id
-- and then aliasing profiles.id AS user_id, creating ambiguity
-- =====================================================

CREATE OR REPLACE FUNCTION get_listing_chat_participants(
    p_listing_id BIGINT
)
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    avatar_url TEXT,
    is_owner BOOLEAN,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_listing_owner_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get the listing owner (renamed variable to avoid confusion)
    SELECT tl.user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    IF v_listing_owner_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Only listing owner can see participants
    IF auth.uid() != v_listing_owner_id THEN
        RAISE EXCEPTION 'Only the listing owner can view participants';
    END IF;

    -- Return distinct participants with last message info
    RETURN QUERY
    WITH participant_messages AS (
        SELECT DISTINCT ON (
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END
        )
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END AS participant_id,
            tc.message AS last_msg,
            tc.created_at AS last_msg_at
        FROM trade_chats tc
        WHERE tc.listing_id = p_listing_id
        ORDER BY
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END,
            tc.created_at DESC
    ),
    unread_counts AS (
        SELECT
            tc.sender_id AS participant_id,
            COUNT(*) AS unread
        FROM trade_chats tc
        WHERE tc.listing_id = p_listing_id
        AND tc.receiver_id = v_listing_owner_id
        AND tc.is_read = FALSE
        GROUP BY tc.sender_id
    )
    SELECT
        prof.id AS user_id,
        prof.nickname,
        prof.avatar_url,
        (prof.id = v_listing_owner_id) AS is_owner,
        pm.last_msg AS last_message,
        pm.last_msg_at AS last_message_at,
        COALESCE(uc.unread, 0)::INTEGER AS unread_count
    FROM profiles prof
    INNER JOIN participant_messages pm ON prof.id = pm.participant_id
    LEFT JOIN unread_counts uc ON prof.id = uc.participant_id
    ORDER BY pm.last_msg_at DESC;
END;
$$;

COMMENT ON FUNCTION get_listing_chat_participants IS 'Get all participants in a listing chat with last message and unread count (seller only)';
