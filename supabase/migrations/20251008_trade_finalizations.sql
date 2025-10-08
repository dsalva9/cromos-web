-- Migration: Trade Finalizations
-- Description: Add trade_finalizations table and mark_trade_finalized RPC for two-step completion workflow
-- Version: v1.4.4
-- Date: 2025-10-08

-- =============================================
-- PART 1: CREATE TABLE
-- =============================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS trade_finalizations CASCADE;

-- Create trade_finalizations table
CREATE TABLE trade_finalizations (
  trade_id BIGINT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (trade_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_finalizations_trade_id
  ON trade_finalizations(trade_id);

CREATE INDEX IF NOT EXISTS idx_trade_finalizations_user_id
  ON trade_finalizations(user_id);

-- Add table comment
COMMENT ON TABLE trade_finalizations IS
  'Tracks which users have marked a trade as finalized. When both participants mark it, the trade moves to completed status.';

-- =============================================
-- PART 2: ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE trade_finalizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see finalizations for trades they're involved in
DROP POLICY IF EXISTS trade_finalizations_select_policy ON trade_finalizations;
CREATE POLICY trade_finalizations_select_policy
  ON trade_finalizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trade_proposals tp
      WHERE tp.id = trade_finalizations.trade_id
        AND (tp.from_user = auth.uid() OR tp.to_user = auth.uid())
    )
  );

-- Policy: Users can only insert their own finalizations (via RPC only)
DROP POLICY IF EXISTS trade_finalizations_insert_policy ON trade_finalizations;
CREATE POLICY trade_finalizations_insert_policy
  ON trade_finalizations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies - finalizations are immutable once created

-- =============================================
-- PART 3: RPC FUNCTION
-- =============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS mark_trade_finalized(BIGINT);

-- Create mark_trade_finalized RPC
CREATE OR REPLACE FUNCTION mark_trade_finalized(
  p_trade_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_caller_id UUID;
  v_from_user UUID;
  v_to_user UUID;
  v_status TEXT;
  v_both_finalized BOOLEAN;
  v_finalization_count INT;
BEGIN
  -- Get authenticated user
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get trade details and validate user is a participant
  SELECT tp.from_user, tp.to_user, tp.status
  INTO v_from_user, v_to_user, v_status
  FROM trade_proposals tp
  WHERE tp.id = p_trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade proposal not found';
  END IF;

  -- Verify caller is a participant
  IF v_caller_id <> v_from_user AND v_caller_id <> v_to_user THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this trade';
  END IF;

  -- Verify trade is in accepted status
  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'Trade must be in accepted status to finalize';
  END IF;

  -- Upsert finalization for current user (idempotent)
  INSERT INTO trade_finalizations (trade_id, user_id, finalized_at)
  VALUES (p_trade_id, v_caller_id, NOW())
  ON CONFLICT (trade_id, user_id) DO NOTHING;

  -- Check if both users have finalized
  SELECT COUNT(*)
  INTO v_finalization_count
  FROM trade_finalizations
  WHERE trade_id = p_trade_id;

  v_both_finalized := (v_finalization_count = 2);

  -- If both finalized, update trades_history to completed
  IF v_both_finalized THEN
    -- Upsert into trades_history with completed status
    INSERT INTO trades_history (trade_id, status, completed_at, metadata)
    VALUES (
      p_trade_id,
      'completed',
      NOW(),
      jsonb_build_object('finalized_by_both', true)
    )
    ON CONFLICT (trade_id)
    DO UPDATE SET
      status = 'completed',
      completed_at = NOW(),
      metadata = trades_history.metadata || jsonb_build_object('finalized_by_both', true);

    -- Return completed status
    RETURN jsonb_build_object(
      'status', 'completed',
      'both_finalized', true,
      'who_marked', 'me',
      'trade_id', p_trade_id
    );
  ELSE
    -- Return accepted status with partial finalization
    RETURN jsonb_build_object(
      'status', 'accepted',
      'both_finalized', false,
      'who_marked', 'me',
      'finalization_count', v_finalization_count,
      'trade_id', p_trade_id
    );
  END IF;
END;
$$;

-- Revoke default permissions and grant to authenticated users only
REVOKE ALL ON FUNCTION mark_trade_finalized(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_trade_finalized(BIGINT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION mark_trade_finalized(BIGINT) IS
  'Marks a trade as finalized by the current user. When both participants have finalized, the trade is moved to completed status in trades_history. Returns JSON with status and finalization info.';

-- =============================================
-- VERIFICATION QUERIES (commented out - for testing)
-- =============================================

-- Test queries (uncomment to verify):
-- SELECT * FROM trade_finalizations;
-- SELECT mark_trade_finalized(123);
-- SELECT * FROM trades_history WHERE trade_id = 123;
