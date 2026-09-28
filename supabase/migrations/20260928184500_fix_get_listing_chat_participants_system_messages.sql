-- Migration: Fix get_listing_chat_participants filtering out system messages and null users
-- Description:
-- Exclude is_system messages and rows with NULL or owner participant_id from get_listing_chat_participants()
-- to prevent phantom 'Usuario eliminado' entries with null user_id and null is_owner causing Zod validation errors.

CREATE OR REPLACE FUNCTION public.get_listing_chat_participants(p_listing_id bigint)
RETURNS TABLE(
  user_id uuid,
  nickname text,
  avatar_url text,
  is_owner boolean,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count integer,
  is_suspended boolean,
  is_deleted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_listing_owner_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    SELECT tl.user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    IF v_listing_owner_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF auth.uid() != v_listing_owner_id THEN
        RAISE EXCEPTION 'Only the listing owner can view participants';
    END IF;

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
          AND tc.is_system = FALSE
          AND (
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END
          ) IS NOT NULL
          AND (
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END
          ) != v_listing_owner_id
          AND NOT EXISTS (
            SELECT 1 FROM deleted_marketplace_conversations dmc
            WHERE dmc.user_id = v_listing_owner_id
              AND dmc.listing_id = p_listing_id
              AND dmc.counterparty_id = (CASE WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id ELSE tc.sender_id END)
              AND tc.created_at <= dmc.deleted_at
          )
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
        AND tc.is_system = FALSE
        AND tc.sender_id IS NOT NULL
        AND tc.sender_id != v_listing_owner_id
        AND NOT EXISTS (
            SELECT 1 FROM deleted_marketplace_conversations dmc
            WHERE dmc.user_id = v_listing_owner_id
              AND dmc.listing_id = p_listing_id
              AND dmc.counterparty_id = tc.sender_id
              AND tc.created_at <= dmc.deleted_at
        )
        GROUP BY tc.sender_id
    )
    SELECT
        pm.participant_id AS user_id,
        COALESCE(prof.nickname, 'Usuario eliminado')::text AS nickname,
        prof.avatar_url,
        COALESCE(pm.participant_id = v_listing_owner_id, false) AS is_owner,
        pm.last_msg AS last_message,
        pm.last_msg_at AS last_message_at,
        COALESCE(uc.unread, 0)::INTEGER AS unread_count,
        (COALESCE(prof.is_suspended, false) = true AND prof.deleted_at IS NULL) AS is_suspended,
        (prof.id IS NULL OR prof.deleted_at IS NOT NULL) AS is_deleted
    FROM participant_messages pm
    LEFT JOIN profiles prof ON prof.id = pm.participant_id
    LEFT JOIN unread_counts uc ON pm.participant_id = uc.participant_id
    WHERE pm.participant_id IS NOT NULL
    ORDER BY pm.last_msg_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_listing_chat_participants(bigint) IS 'Get all participants in a listing chat with last message and unread count (seller only)';
GRANT ALL ON FUNCTION public.get_listing_chat_participants(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_listing_chat_participants(bigint) TO service_role;
