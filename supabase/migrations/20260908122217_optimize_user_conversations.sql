-- Migration: Optimize get_user_conversations query performance
-- Pre-filters listing IDs using existing indexes and replaces expensive partition window functions with DISTINCT ON

CREATE OR REPLACE FUNCTION public.get_user_conversations() 
RETURNS TABLE(
    listing_id bigint, 
    listing_title text, 
    listing_image_url text, 
    listing_status text, 
    counterparty_id uuid, 
    counterparty_nickname text, 
    counterparty_avatar_url text, 
    last_message text, 
    last_message_at timestamp with time zone, 
    unread_count bigint, 
    is_seller boolean,
    counterparty_is_deleted boolean,
    listing_is_unavailable boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  WITH
  user_listing_ids AS (
    SELECT DISTINCT tc.listing_id AS lid
    FROM trade_chats tc
    WHERE tc.listing_id IS NOT NULL
      AND (tc.sender_id = v_user_id OR tc.receiver_id = v_user_id)
  ),
  owned_listing_ids AS (
    SELECT tl.id AS lid
    FROM trade_listings tl
    WHERE tl.user_id = v_user_id
      AND EXISTS (
        SELECT 1 FROM trade_chats tc2
        WHERE tc2.listing_id = tl.id AND tc2.listing_id IS NOT NULL
      )
  ),
  all_listing_ids AS (
    SELECT lid FROM user_listing_ids
    UNION
    SELECT lid FROM owned_listing_ids
  ),
  user_chats AS (
    SELECT DISTINCT
      ali.lid AS listing_id,
      CASE
        WHEN tl.user_id = v_user_id THEN tc.sender_id
        WHEN tc.sender_id = v_user_id THEN tc.receiver_id
        ELSE COALESCE(tl.user_id, tc.sender_id)
      END AS counterparty_id,
      COALESCE(tl.user_id = v_user_id, false) AS is_seller
    FROM all_listing_ids ali
    JOIN trade_chats tc ON tc.listing_id = ali.lid
    LEFT JOIN trade_listings tl ON tl.id = ali.lid
    WHERE tc.sender_id = v_user_id
       OR tc.receiver_id = v_user_id
       OR tl.user_id = v_user_id
  ),
  valid_user_chats AS (
    SELECT uc.*
    FROM user_chats uc
    WHERE uc.counterparty_id IS NOT NULL
      AND uc.counterparty_id != v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM hidden_conversations hc
        WHERE hc.user_id = v_user_id
          AND hc.listing_id = uc.listing_id
          AND hc.counterparty_id = uc.counterparty_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM ignored_listings il
        WHERE il.user_id = v_user_id
          AND il.listing_id = uc.listing_id
      )
  ),
  last_messages AS (
    SELECT DISTINCT ON (vuc.listing_id, vuc.counterparty_id)
      vuc.listing_id,
      vuc.counterparty_id,
      tc.message AS last_message,
      tc.created_at AS last_message_at
    FROM valid_user_chats vuc
    JOIN trade_chats tc ON tc.listing_id = vuc.listing_id
    WHERE tc.is_system = FALSE
      AND (
        (tc.sender_id = v_user_id AND tc.receiver_id = vuc.counterparty_id)
        OR (tc.sender_id = vuc.counterparty_id AND tc.receiver_id = v_user_id)
      )
    ORDER BY vuc.listing_id, vuc.counterparty_id, tc.created_at DESC
  ),
  unread_counts AS (
    SELECT
      vuc.listing_id,
      vuc.counterparty_id,
      COUNT(*) AS unread_count
    FROM valid_user_chats vuc
    JOIN trade_chats tc ON tc.listing_id = vuc.listing_id
    WHERE tc.is_read = FALSE
      AND tc.receiver_id = v_user_id
      AND tc.sender_id = vuc.counterparty_id
    GROUP BY vuc.listing_id, vuc.counterparty_id
  )
  SELECT
    vuc.listing_id,
    COALESCE(tl.title, 'Anuncio') AS listing_title,
    tl.image_url AS listing_image_url,
    COALESCE(tl.status, 'archived') AS listing_status,
    vuc.counterparty_id,
    COALESCE(p.nickname, 'Usuario eliminado') AS counterparty_nickname,
    p.avatar_url AS counterparty_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_at,
    COALESCE(uc_count.unread_count, 0)::bigint AS unread_count,
    vuc.is_seller,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS counterparty_is_deleted,
    (tl.id IS NULL OR tl.status IN ('archived', 'removed')) AS listing_is_unavailable
  FROM valid_user_chats vuc
  LEFT JOIN trade_listings tl ON tl.id = vuc.listing_id
  LEFT JOIN profiles p ON p.id = vuc.counterparty_id
  LEFT JOIN last_messages lm ON lm.listing_id = vuc.listing_id
    AND lm.counterparty_id = vuc.counterparty_id
  LEFT JOIN unread_counts uc_count ON uc_count.listing_id = vuc.listing_id
    AND uc_count.counterparty_id = vuc.counterparty_id
  ORDER BY COALESCE(lm.last_message_at, tl.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated;

-- Partial index for fast unread count lookups on match conversations
CREATE INDEX IF NOT EXISTS idx_trade_chats_match_unread 
ON public.trade_chats (match_conversation_id, receiver_id) 
WHERE is_read = false AND match_conversation_id IS NOT NULL;
