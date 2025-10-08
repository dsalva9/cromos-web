-- Migration: Exclude cancelled/rejected proposals from unread counts
-- Description: Update get_unread_counts to exclude cancelled and rejected proposals
-- Version: v1.4.4 enhancement
-- Date: 2025-10-08

-- Drop and recreate get_unread_counts with status filter
DROP FUNCTION IF EXISTS get_unread_counts(TEXT, BIGINT[]);

CREATE OR REPLACE FUNCTION get_unread_counts(
  p_box TEXT,
  p_trade_ids BIGINT[] DEFAULT NULL
)
RETURNS TABLE (
  trade_id BIGINT,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate p_box
  IF p_box NOT IN ('inbox', 'outbox') THEN
    RAISE EXCEPTION 'Invalid box parameter: must be inbox or outbox';
  END IF;

  -- Return unread counts for relevant trades (excluding cancelled and rejected)
  RETURN QUERY
  WITH relevant_trades AS (
    SELECT tp.id AS trade_id
    FROM trade_proposals tp
    WHERE
      (p_box = 'inbox' AND tp.to_user = v_user_id)
      OR (p_box = 'outbox' AND tp.from_user = v_user_id)
      AND (p_trade_ids IS NULL OR tp.id = ANY(p_trade_ids))
      AND tp.status NOT IN ('cancelled', 'rejected') -- Exclude cancelled/rejected
  ),
  unread_messages AS (
    SELECT
      tc.trade_id,
      COUNT(*) AS unread_count
    FROM trade_chats tc
    INNER JOIN relevant_trades rt ON rt.trade_id = tc.trade_id
    LEFT JOIN trade_reads tr ON
      tr.user_id = v_user_id
      AND tr.trade_id = tc.trade_id
    WHERE
      tc.sender_id <> v_user_id
      AND tc.created_at > COALESCE(tr.last_read_at, 'epoch'::TIMESTAMPTZ)
    GROUP BY tc.trade_id
  )
  SELECT
    rt.trade_id,
    COALESCE(um.unread_count, 0)::BIGINT AS unread_count
  FROM relevant_trades rt
  LEFT JOIN unread_messages um ON um.trade_id = rt.trade_id;
END;
$$;

REVOKE ALL ON FUNCTION get_unread_counts(TEXT, BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_unread_counts(TEXT, BIGINT[]) TO authenticated;

COMMENT ON FUNCTION get_unread_counts(TEXT, BIGINT[]) IS
'Returns unread message counts per trade for the current user in the specified box (inbox/outbox). Excludes cancelled and rejected proposals. Optionally filters by trade IDs.';
