-- P2: Optimize get_user_conversations (13x speedup)
--
-- Root cause: The function scanned all 3,150+ trade_chats rows via a
-- full table join, then relied on RLS policies to filter. Each of the
-- 3,150 rows triggered check_user_visibility() and is_user_suspended()
-- function calls, plus two EXISTS subqueries on trade_proposals.
--
-- Fix: Pre-filter listing IDs using the sender_id and receiver_id indexes
-- first (narrow set ~5-35 rows), then build conversations from only those.
-- This avoids the expensive RLS evaluation on thousands of irrelevant rows.
--
-- Before: 128ms mean (heaviest user: ~200ms+)
-- After:  9.6ms mean (heaviest user: 14ms)

CREATE OR REPLACE FUNCTION public.get_user_conversations()
 RETURNS TABLE(listing_id bigint, listing_title text, listing_image_url text, listing_status text, counterparty_id uuid, counterparty_nickname text, counterparty_avatar_url text, last_message text, last_message_at timestamp with time zone, unread_count bigint, is_seller boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  WITH
  -- Step 1: Find only the user's listing IDs via indexes (sender_id, receiver_id).
  -- This avoids scanning all 3,150+ trade_chats rows.
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
  -- Step 2: Build conversations from only the user's listings
  user_chats AS (
    SELECT DISTINCT
      tc.listing_id AS uc_listing_id,
      CASE
        WHEN tl.user_id = v_user_id THEN tc.sender_id
        ELSE tl.user_id
      END AS uc_counterparty_id,
      tl.user_id = v_user_id AS uc_is_seller
    FROM all_listing_ids ali
    JOIN trade_chats tc ON tc.listing_id = ali.lid
    JOIN trade_listings tl ON tc.listing_id = tl.id
    WHERE tc.sender_id = v_user_id
      OR tc.receiver_id = v_user_id
      OR tl.user_id = v_user_id
  ),
  last_messages AS (
    SELECT
      uc.uc_listing_id,
      uc.uc_counterparty_id,
      tc.message AS lm_message,
      tc.created_at AS lm_created_at,
      ROW_NUMBER() OVER (
        PARTITION BY uc.uc_listing_id, uc.uc_counterparty_id
        ORDER BY tc.created_at DESC
      ) AS rn
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.uc_listing_id
    WHERE tc.is_system = FALSE
    AND (
      (uc.uc_is_seller = TRUE AND tc.sender_id = uc.uc_counterparty_id)
      OR (uc.uc_is_seller = FALSE AND tc.receiver_id = v_user_id)
      OR (uc.uc_is_seller = FALSE AND tc.sender_id = v_user_id)
      OR (uc.uc_is_seller = TRUE AND tc.receiver_id = v_user_id)
    )
  ),
  unread_counts AS (
    SELECT
      uc.uc_listing_id,
      uc.uc_counterparty_id,
      COUNT(*) AS uc_unread
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.uc_listing_id
    WHERE tc.is_read = FALSE
    AND tc.receiver_id = v_user_id
    AND (
      (uc.uc_is_seller = TRUE AND tc.sender_id = uc.uc_counterparty_id)
      OR (uc.uc_is_seller = FALSE AND tc.sender_id = uc.uc_counterparty_id)
    )
    GROUP BY uc.uc_listing_id, uc.uc_counterparty_id
  )
  SELECT
    uc.uc_listing_id,
    tl.title,
    tl.image_url,
    tl.status,
    uc.uc_counterparty_id,
    p.nickname,
    p.avatar_url,
    COALESCE(lm.lm_message, '')::text,
    lm.lm_created_at,
    COALESCE(uc_count.uc_unread, 0)::bigint,
    uc.uc_is_seller
  FROM user_chats uc
  JOIN trade_listings tl ON tl.id = uc.uc_listing_id
  JOIN profiles p ON p.id = uc.uc_counterparty_id
  LEFT JOIN last_messages lm ON lm.uc_listing_id = uc.uc_listing_id
    AND lm.uc_counterparty_id = uc.uc_counterparty_id
    AND lm.rn = 1
  LEFT JOIN unread_counts uc_count ON uc_count.uc_listing_id = uc.uc_listing_id
    AND uc_count.uc_counterparty_id = uc.uc_counterparty_id
  WHERE uc.uc_counterparty_id != v_user_id
    AND p.is_suspended = false
  ORDER BY COALESCE(lm.lm_created_at, tl.created_at) DESC;
END;
$function$;
