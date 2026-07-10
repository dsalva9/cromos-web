-- Migration: Fix get_listing_chats ambiguous id and restore image columns
-- Qualifies table columns explicitly to resolve ambiguous column references and restores image columns.

DROP FUNCTION IF EXISTS public.get_listing_chats(bigint, uuid);

CREATE OR REPLACE FUNCTION public.get_listing_chats(
    p_listing_id bigint, 
    p_participant_id uuid DEFAULT NULL::uuid
) 
RETURNS TABLE(
    id bigint, 
    sender_id uuid, 
    receiver_id uuid, 
    sender_nickname text, 
    message text, 
    is_read boolean, 
    is_system boolean, 
    created_at timestamp with time zone,
    image_url text,
    thumbnail_url text
) 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_listing_owner_id UUID;
    v_listing_status TEXT;
    v_has_chat_access BOOLEAN;
    v_reservation_buyer_id UUID;
    v_reservation_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner and status
    SELECT user_id, status INTO v_listing_owner_id, v_listing_status
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- Block access if listing is archived (unless admin)
    IF v_listing_status = 'archived' AND NOT EXISTS (
        SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: this listing and its chats have been archived';
    END IF;

    -- If listing doesn't exist, check if user has chat history
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

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

    SELECT buyer_id, status INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions lt
    WHERE lt.listing_id = p_listing_id
    AND lt.status IN ('reserved', 'pending_completion', 'completed')
    ORDER BY lt.created_at DESC
    LIMIT 1;

    -- Check if caller has access to read the chat messages
    IF auth.uid() != v_listing_owner_id 
       AND auth.uid() != COALESCE(p_participant_id, auth.uid()) 
       AND auth.uid() != v_reservation_buyer_id
       AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.is_admin = TRUE) 
    THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        tc.id,
        tc.sender_id,
        tc.receiver_id,
        p.nickname AS sender_nickname,
        tc.message,
        tc.is_read,
        tc.is_system,
        tc.created_at,
        tc.image_url,
        tc.thumbnail_url
    FROM trade_chats tc
    JOIN profiles p ON p.id = tc.sender_id
    WHERE tc.listing_id = p_listing_id
      AND (
          -- Owner sees all chats
          auth.uid() = v_listing_owner_id
          -- Buyer sees their own conversation
          OR tc.sender_id = auth.uid()
          OR tc.receiver_id = auth.uid()
          -- Admins see everything
          OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.is_admin = TRUE)
      )
      AND (
          p_participant_id IS NULL
          OR tc.sender_id = p_participant_id
          OR tc.receiver_id = p_participant_id
      )
    ORDER BY tc.created_at ASC;
END;
$$;
