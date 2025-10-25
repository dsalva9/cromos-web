-- =====================================================
-- Fix Listing Chat RPCs - Drop and Recreate
-- =====================================================
-- This file drops existing versions and recreates them
-- Apply this via Supabase Dashboard > SQL Editor
-- Date: 2025-10-25
-- =====================================================

-- Drop existing functions (all overloads)
DROP FUNCTION IF EXISTS send_listing_message CASCADE;
DROP FUNCTION IF EXISTS get_listing_chats CASCADE;
DROP FUNCTION IF EXISTS get_listing_chat_participants CASCADE;
DROP FUNCTION IF EXISTS mark_listing_messages_read CASCADE;

-- Function 1: Send listing message
CREATE FUNCTION send_listing_message(
    p_listing_id BIGINT,
    p_receiver_id UUID,
    p_message TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_listing_user_id UUID;
    v_message_id BIGINT;
    v_message_length INTEGER := 500;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate message is not empty
    IF TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    -- Validate message length
    IF LENGTH(p_message) > v_message_length THEN
        RAISE EXCEPTION 'Message cannot be longer than 500 characters';
    END IF;

    -- Validate receiver exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_receiver_id) THEN
        RAISE EXCEPTION 'Receiver not found';
    END IF;

    -- Validate not sending to yourself
    IF auth.uid() = p_receiver_id THEN
        RAISE EXCEPTION 'You cannot send messages to yourself';
    END IF;

    -- Get the listing owner and validate listing exists
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Validate sender is either listing owner or has previously messaged
    IF auth.uid() != v_listing_user_id THEN
        -- Buyer must be sending to owner
        IF p_receiver_id != v_listing_user_id THEN
            RAISE EXCEPTION 'You can only send messages to the listing owner';
        END IF;
    ELSE
        -- Seller sending reply - ensure receiver has previously messaged
        IF NOT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE listing_id = p_listing_id
            AND sender_id = p_receiver_id
        ) THEN
            RAISE EXCEPTION 'You can only reply to users who have messaged you';
        END IF;
    END IF;

    -- Insert the message
    INSERT INTO trade_chats (
        listing_id,
        sender_id,
        receiver_id,
        message,
        is_read
    ) VALUES (
        p_listing_id,
        auth.uid(),
        p_receiver_id,
        TRIM(p_message),
        FALSE
    ) RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- Function 2: Get listing chats
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
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;

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

-- Function 3: Get listing chat participants
CREATE FUNCTION get_listing_chat_participants(
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
    v_listing_user_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get the listing owner
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Only listing owner can see participants
    IF auth.uid() != v_listing_user_id THEN
        RAISE EXCEPTION 'Only the listing owner can view participants';
    END IF;

    -- Return distinct participants with last message info
    RETURN QUERY
    WITH participant_messages AS (
        SELECT DISTINCT ON (
            CASE
                WHEN sender_id = v_listing_user_id THEN receiver_id
                ELSE sender_id
            END
        )
            CASE
                WHEN sender_id = v_listing_user_id THEN receiver_id
                ELSE sender_id
            END AS participant_id,
            message AS last_msg,
            created_at AS last_msg_at
        FROM trade_chats
        WHERE listing_id = p_listing_id
        ORDER BY
            CASE
                WHEN sender_id = v_listing_user_id THEN receiver_id
                ELSE sender_id
            END,
            created_at DESC
    ),
    unread_counts AS (
        SELECT
            sender_id AS participant_id,
            COUNT(*) AS unread
        FROM trade_chats
        WHERE listing_id = p_listing_id
        AND receiver_id = v_listing_user_id
        AND is_read = FALSE
        GROUP BY sender_id
    )
    SELECT
        p.id AS user_id,
        p.nickname,
        p.avatar_url,
        (p.id = v_listing_user_id) AS is_owner,
        pm.last_msg AS last_message,
        pm.last_msg_at AS last_message_at,
        COALESCE(uc.unread, 0)::INTEGER AS unread_count
    FROM profiles p
    INNER JOIN participant_messages pm ON p.id = pm.participant_id
    LEFT JOIN unread_counts uc ON p.id = uc.participant_id
    ORDER BY pm.last_msg_at DESC;
END;
$$;

-- Function 4: Mark listing messages as read
CREATE FUNCTION mark_listing_messages_read(
    p_listing_id BIGINT,
    p_sender_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Mark messages as read where current user is receiver
    UPDATE trade_chats
    SET is_read = TRUE
    WHERE listing_id = p_listing_id
    AND sender_id = p_sender_id
    AND receiver_id = auth.uid()
    AND is_read = FALSE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_listing_message(BIGINT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_chats(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_chat_participants(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_listing_messages_read(BIGINT, UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION send_listing_message IS 'Send a message in a listing chat (bidirectional)';
COMMENT ON FUNCTION get_listing_chats IS 'Get chat messages for a listing, optionally filtered by participant';
COMMENT ON FUNCTION get_listing_chat_participants IS 'Get all participants in a listing chat with last message and unread count (seller only)';
COMMENT ON FUNCTION mark_listing_messages_read IS 'Mark messages from a specific sender as read';
