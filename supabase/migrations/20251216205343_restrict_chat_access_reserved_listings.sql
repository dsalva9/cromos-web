-- =====================================================
-- Restrict Chat Access for Reserved Listings
-- =====================================================
-- Purpose: When a listing is reserved, only the buyer (who reserved it)
--          and seller should have chat access. Other users who previously
--          chatted should no longer see the conversation.
-- Date: 2025-12-16
-- =====================================================

CREATE OR REPLACE FUNCTION get_listing_chats(
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
    is_system BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_listing_owner_id UUID;
    v_has_chat_access BOOLEAN;
    v_reservation_buyer_id UUID;
    v_reservation_status TEXT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner
    SELECT user_id INTO v_listing_owner_id
    FROM trade_listings
    WHERE id = p_listing_id;

    -- If listing doesn't exist, check if user has chat history (for deleted listings)
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        -- Get listing owner from chat history
        v_listing_owner_id := (
            SELECT DISTINCT
                CASE
                    WHEN trade_chats.sender_id = auth.uid() THEN trade_chats.receiver_id
                    ELSE trade_chats.sender_id
                END
            FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
            LIMIT 1
        );
    END IF;

    -- Check if listing is reserved
    SELECT buyer_id, status
    INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions
    WHERE listing_id = p_listing_id
    AND status IN ('reserved', 'pending_completion')
    ORDER BY created_at DESC
    LIMIT 1;

    -- If listing is reserved, only allow seller and buyer to access chat
    IF v_reservation_buyer_id IS NOT NULL THEN
        IF auth.uid() != v_listing_owner_id AND auth.uid() != v_reservation_buyer_id THEN
            RAISE EXCEPTION 'This listing is reserved. Only the seller and buyer can access this chat.';
        END IF;
    ELSE
        -- Not reserved - check normal chat access
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) INTO v_has_chat_access;

        -- If no chat access and not the owner, check if user can see the listing
        IF NOT v_has_chat_access AND auth.uid() != v_listing_owner_id THEN
            -- User must be able to see the listing to start chatting
            -- RLS will have already checked this when getting the listing
            -- If they got here, allow them to see empty chat (to start conversation)
            RETURN;
        END IF;
    END IF;

    -- Now return messages based on user role
    IF auth.uid() = v_listing_owner_id THEN
        -- Seller viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific buyer conversation
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (
                tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid()) OR
                tc.sender_id = p_participant_id OR
                tc.receiver_id = p_participant_id
            )
            ORDER BY tc.created_at ASC;
        ELSE
            -- Viewing all conversations
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())
            ORDER BY tc.created_at ASC;
        END IF;
    ELSE
        -- Buyer viewing own conversation with seller
        IF p_participant_id IS NOT NULL AND p_participant_id != v_listing_owner_id THEN
            RAISE EXCEPTION 'You can only view your own conversation';
        END IF;

        RETURN QUERY
        SELECT
            tc.id,
            tc.sender_id,
            tc.receiver_id,
            COALESCE(p.nickname, '') AS sender_nickname,
            tc.message,
            tc.is_read,
            tc.is_system,
            tc.created_at
        FROM trade_chats tc
        LEFT JOIN profiles p ON tc.sender_id = p.id
        WHERE tc.listing_id = p_listing_id
        AND (
            (tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())) OR
            tc.sender_id = auth.uid() OR
            tc.receiver_id = auth.uid()
        )
        ORDER BY tc.created_at ASC;
    END IF;
END;
$$;

COMMENT ON FUNCTION get_listing_chats IS 'Get chat messages for a listing - restricts access to seller and buyer when listing is reserved';
