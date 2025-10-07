-- =====================================================================
-- Migration: Trade Chat UI + Unread Message Badges (v1.4.2)
-- Created: 2025-10-07
-- Description:
--   - Add trade_reads table for tracking last read timestamps per user/trade
--   - Add mark_trade_read RPC for marking trades as read
--   - Add get_unread_counts RPC for fetching unread message counts
-- =====================================================================

-- =====================================================================
-- PART 1: trade_reads table
-- =====================================================================

CREATE TABLE IF NOT EXISTS trade_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trade_id BIGINT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, trade_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trade_reads_user_id
ON trade_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_reads_trade_id
ON trade_reads(trade_id);

-- RLS Policies: Owner-only access
ALTER TABLE trade_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own trade_reads" ON trade_reads;
CREATE POLICY "Users can read own trade_reads" ON trade_reads
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own trade_reads" ON trade_reads;
CREATE POLICY "Users can insert own trade_reads" ON trade_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own trade_reads" ON trade_reads;
CREATE POLICY "Users can update own trade_reads" ON trade_reads
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own trade_reads" ON trade_reads;
CREATE POLICY "Users can delete own trade_reads" ON trade_reads
  FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE trade_reads IS
'Tracks last read timestamp for each user per trade (for unread message badges)';

-- =====================================================================
-- PART 2: mark_trade_read RPC
-- =====================================================================

DROP FUNCTION IF EXISTS mark_trade_read(BIGINT);

CREATE OR REPLACE FUNCTION mark_trade_read(
  p_trade_id BIGINT
)
RETURNS VOID
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

  -- Verify user is a participant in this trade
  IF NOT EXISTS (
    SELECT 1
    FROM trade_proposals
    WHERE id = p_trade_id
      AND (from_user = v_user_id OR to_user = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not a participant in this trade';
  END IF;

  -- Upsert last_read_at
  INSERT INTO trade_reads (user_id, trade_id, last_read_at)
  VALUES (v_user_id, p_trade_id, NOW())
  ON CONFLICT (user_id, trade_id)
  DO UPDATE SET last_read_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION mark_trade_read(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_trade_read(BIGINT) TO authenticated;

COMMENT ON FUNCTION mark_trade_read(BIGINT) IS
'Marks a trade as read for the current user (upserts last_read_at timestamp)';

-- =====================================================================
-- PART 3: get_unread_counts RPC
-- =====================================================================

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

  -- Return unread counts for relevant trades
  RETURN QUERY
  WITH relevant_trades AS (
    SELECT tp.id AS trade_id
    FROM trade_proposals tp
    WHERE
      (p_box = 'inbox' AND tp.to_user = v_user_id)
      OR (p_box = 'outbox' AND tp.from_user = v_user_id)
      AND (p_trade_ids IS NULL OR tp.id = ANY(p_trade_ids))
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
'Returns unread message counts per trade for the current user in the specified box (inbox/outbox). Optionally filters by trade IDs.';

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
