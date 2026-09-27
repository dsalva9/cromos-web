-- Migration: Fix delete_marketplace_conversation notification cleanup and constraints
-- 1. Relax foreign keys on deleted_marketplace_conversations to prevent FK violation on deleted listings/profiles
ALTER TABLE public.deleted_marketplace_conversations
    DROP CONSTRAINT IF EXISTS deleted_marketplace_conversations_listing_id_fkey;

ALTER TABLE public.deleted_marketplace_conversations
    DROP CONSTRAINT IF EXISTS deleted_marketplace_conversations_counterparty_id_fkey;

-- 2. Fix delete_marketplace_conversation RPC
-- Fixes column reference: 'kind' instead of non-existent 'type', and safe block for notification cleanup
CREATE OR REPLACE FUNCTION public.delete_marketplace_conversation(
    p_listing_id bigint,
    p_counterparty_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_me uuid := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Record deletion timestamp for current user
    INSERT INTO public.deleted_marketplace_conversations (user_id, listing_id, counterparty_id, deleted_at)
    VALUES (v_me, p_listing_id, p_counterparty_id, now())
    ON CONFLICT (user_id, listing_id, counterparty_id)
    DO UPDATE SET deleted_at = now();

    -- Remove from hidden_conversations if it was hidden
    DELETE FROM public.hidden_conversations
    WHERE user_id = v_me
      AND listing_id = p_listing_id
      AND counterparty_id = p_counterparty_id;

    -- Clean up related unread listing_chat notifications for this user safely
    BEGIN
        DELETE FROM public.notifications
        WHERE user_id = v_me
          AND kind = 'listing_chat'
          AND listing_id = p_listing_id
          AND (actor_id = p_counterparty_id OR actor_id IS NULL);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_marketplace_conversation(bigint, uuid) TO authenticated;

-- 3. Ensure get_listing_chats properly filters out messages before deleted_at including system messages
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
    v_me UUID := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner and status
    SELECT user_id, status INTO v_listing_owner_id, v_listing_status
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- If listing doesn't exist, check if user has chat history
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = v_me OR trade_chats.receiver_id = v_me)
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        v_listing_owner_id := (
            SELECT DISTINCT
                CASE
                    WHEN trade_chats.sender_id = v_me THEN trade_chats.receiver_id
                    ELSE trade_chats.sender_id
                END
            FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = v_me OR trade_chats.receiver_id = v_me)
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
    IF v_me != v_listing_owner_id 
       AND v_me != COALESCE(p_participant_id, v_me) 
       AND v_me != v_reservation_buyer_id
       AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = v_me AND pr.is_admin = TRUE) 
    THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        tc.id,
        tc.sender_id,
        tc.receiver_id,
        COALESCE(p.nickname, 'Usuario eliminado')::text AS sender_nickname,
        tc.message,
        tc.is_read,
        tc.is_system,
        tc.created_at,
        tc.image_url,
        tc.thumbnail_url
    FROM trade_chats tc
    LEFT JOIN profiles p ON p.id = tc.sender_id
    WHERE tc.listing_id = p_listing_id
      AND (
          -- Owner sees all chats or filtered by selected participant
          (v_me = v_listing_owner_id AND (
              p_participant_id IS NULL
              OR tc.sender_id = p_participant_id
              OR tc.receiver_id = p_participant_id
          ))
          -- Non-owner sees only their own conversation with the owner
          OR (v_me != v_listing_owner_id AND (
              tc.sender_id = v_me
              OR tc.receiver_id = v_me
          ))
      )
      -- Filter out messages before deleted_at if this user deleted the conversation
      AND NOT EXISTS (
          SELECT 1 FROM deleted_marketplace_conversations dmc
          WHERE dmc.user_id = v_me
            AND dmc.listing_id = p_listing_id
            AND dmc.counterparty_id = (
                CASE
                    WHEN v_me = v_listing_owner_id THEN COALESCE(p_participant_id, CASE WHEN tc.sender_id = v_me THEN tc.receiver_id ELSE tc.sender_id END)
                    ELSE v_listing_owner_id
                END
            )
            AND tc.created_at <= dmc.deleted_at
      )
    ORDER BY tc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_chats(bigint, uuid) TO authenticated;
