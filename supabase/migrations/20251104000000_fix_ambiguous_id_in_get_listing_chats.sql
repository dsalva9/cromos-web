-- =====================================================
-- Fix ambiguous 'id' column reference in get_listing_chats
-- =====================================================
-- Purpose: Explicitly qualify the 'id' column references to avoid ambiguity
-- =====================================================

DROP FUNCTION IF EXISTS get_listing_chats(BIGINT, UUID);

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
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- First check if user has chat access (has sent or received messages for this listing)
    SELECT EXISTS (
        SELECT 1 FROM trade_chats
        WHERE trade_chats.listing_id = p_listing_id
        AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
    ) INTO v_has_chat_access;

    -- If no chat access, check if user can still access this listing
    IF NOT v_has_chat_access THEN
        -- Try to get listing owner (will succeed if listing is active OR user is owner)
        SELECT user_id INTO v_listing_owner_id
        FROM trade_listings
        WHERE trade_listings.id = p_listing_id;

        -- If we couldn't get the listing, it either doesn't exist or user has no access
        IF v_listing_owner_id IS NULL THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        -- If user is not the owner and has no chat history, they must be a potential buyer
        -- This is allowed ONLY if they can see the listing (RLS already checked this)
        -- If they got here, RLS allowed access, so we can proceed with empty chat
        IF auth.uid() != v_listing_owner_id THEN
            -- User is a buyer with no messages yet - allow access to start chatting
            -- Return empty result set
            RETURN;
        END IF;
    ELSE
        -- User has chat access, get listing owner for logic below
        SELECT user_id INTO v_listing_owner_id
        FROM trade_listings
        WHERE trade_listings.id = p_listing_id;

        -- If we still can't get listing owner, it means listing doesn't exist at all
        IF v_listing_owner_id IS NULL THEN
            -- But since user has chat messages, allow access to chat
            -- (listing might have been deleted but chat should remain)
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
    END IF;

    -- Now determine access and filtering based on user role
    IF auth.uid() = v_listing_owner_id THEN
        -- Seller viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific buyer conversation
            RETURN QUERY
            SELECT
                tc.id AS id,
                tc.sender_id AS sender_id,
                tc.receiver_id AS receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message AS message,
                tc.is_read AS is_read,
                tc.is_system AS is_system,
                tc.created_at AS created_at
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
                tc.id AS id,
                tc.sender_id AS sender_id,
                tc.receiver_id AS receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message AS message,
                tc.is_read AS is_read,
                tc.is_system AS is_system,
                tc.created_at AS created_at
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
            tc.id AS id,
            tc.sender_id AS sender_id,
            tc.receiver_id AS receiver_id,
            COALESCE(p.nickname, '') AS sender_nickname,
            tc.message AS message,
            tc.is_read AS is_read,
            tc.is_system AS is_system,
            tc.created_at AS created_at
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

GRANT EXECUTE ON FUNCTION get_listing_chats(BIGINT, UUID) TO authenticated;

COMMENT ON FUNCTION get_listing_chats IS 'Get chat messages for a listing - checks chat access first to work around RLS - Fixed ambiguous id references';
