-- Migration: Fix get_listing_chats to allow buyer to pass their own ID as participant
-- Previously, if a buyer accessed a URL with their own ID as participant (e.g. from shared links or history),
-- the function would throw an exception: 'You can only view your own conversation'.
-- This fix checks if the passed participant ID is either the seller's ID or the buyer's own ID.

CREATE OR REPLACE FUNCTION "public"."get_listing_chats"("p_listing_id" bigint, "p_participant_id" "uuid" DEFAULT NULL::"uuid") 
RETURNS TABLE(
    "id" bigint, 
    "sender_id" "uuid", 
    "receiver_id" "uuid", 
    "sender_nickname" "text", 
    "message" "text", 
    "is_read" boolean, 
    "is_system" boolean, 
    "created_at" timestamp with time zone, 
    "image_url" "text", 
    "thumbnail_url" "text"
)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
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

    -- Get listing owner (FIXED: Alias table to avoid ambiguity with output parameter 'id')
    SELECT user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

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

    -- Check transaction status for visibility rules
    SELECT buyer_id, status INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions lt
    WHERE lt.listing_id = p_listing_id
    AND lt.status IN ('reserved', 'pending_completion', 'completed')
    ORDER BY lt.created_at DESC
    LIMIT 1;

    -- Logic for fetching chats based on role
    IF auth.uid() = v_listing_owner_id THEN
        -- Owner viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific conversation
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at,
                tc.image_url,
                tc.thumbnail_url
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (
                (tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())) OR
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
                tc.created_at,
                tc.image_url,
                tc.thumbnail_url
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())
            ORDER BY tc.created_at ASC;
        END IF;
    ELSE
        -- Buyer viewing own conversation with seller
        -- FIX: Added "AND p_participant_id != auth.uid()" to prevent exception when buyer passes their own ID
        IF p_participant_id IS NOT NULL AND p_participant_id != v_listing_owner_id AND p_participant_id != auth.uid() THEN
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
            tc.created_at,
            tc.image_url,
            tc.thumbnail_url
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
