-- Migration: Finalization workflow with accept/reject
-- Description: Add workflow for finalization requests with accept/reject options
-- Version: v1.4.4 enhancement
-- Date: 2025-10-08

-- Add status column to trade_finalizations to track workflow
ALTER TABLE trade_finalizations
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Add rejected_at timestamp
ALTER TABLE trade_finalizations
ADD COLUMN rejected_at TIMESTAMPTZ NULL;

-- Drop the existing RPC and create new one with workflow support
DROP FUNCTION IF EXISTS mark_trade_finalized(BIGINT);

-- New RPC: Request finalization (initiator marks as wanting to finalize)
CREATE OR REPLACE FUNCTION request_trade_finalization(
  p_trade_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID;
  v_from_user UUID;
  v_to_user UUID;
  v_status TEXT;
  v_existing_request RECORD;
  v_result JSONB;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get trade details
  SELECT from_user, to_user, status
  INTO v_from_user, v_to_user, v_status
  FROM trade_proposals
  WHERE id = p_trade_id;

  -- Validate user is a participant
  IF v_user_id NOT IN (v_from_user, v_to_user) THEN
    RAISE EXCEPTION 'User is not a participant in this trade';
  END IF;

  -- Only accepted proposals can be finalized
  IF v_status != 'accepted' THEN
    RAISE EXCEPTION 'Only accepted proposals can be finalized';
  END IF;

  -- Check if there's already a pending or accepted request
  SELECT * INTO v_existing_request
  FROM trade_finalizations
  WHERE trade_id = p_trade_id
    AND status IN ('pending', 'accepted')
  LIMIT 1;

  -- If there's an existing request
  IF v_existing_request.user_id IS NOT NULL THEN
    -- If it's from the same user, do nothing (idempotent)
    IF v_existing_request.user_id = v_user_id THEN
      RETURN jsonb_build_object(
        'status', 'already_requested',
        'requester_id', v_existing_request.user_id,
        'request_status', v_existing_request.status
      );
    ELSE
      -- If it's from the other user, this is an acceptance
      -- Update the existing request to 'accepted' and complete the trade
      UPDATE trade_finalizations
      SET status = 'accepted'
      WHERE trade_id = p_trade_id
        AND user_id = v_existing_request.user_id;

      -- Create trades_history record
      INSERT INTO trades_history (trade_id, status, completed_at)
      VALUES (p_trade_id, 'completed', NOW())
      ON CONFLICT (trade_id) DO UPDATE
      SET status = 'completed', completed_at = NOW();

      RETURN jsonb_build_object(
        'status', 'completed',
        'requester_id', v_existing_request.user_id,
        'accepter_id', v_user_id
      );
    END IF;
  ELSE
    -- No existing request, create a new one
    INSERT INTO trade_finalizations (trade_id, user_id, status, finalized_at)
    VALUES (p_trade_id, v_user_id, 'pending', NOW())
    ON CONFLICT (trade_id, user_id)
    DO UPDATE SET
      status = 'pending',
      finalized_at = NOW(),
      rejected_at = NULL;

    RETURN jsonb_build_object(
      'status', 'pending',
      'requester_id', v_user_id
    );
  END IF;
END;
$$;

-- New RPC: Reject finalization request
CREATE OR REPLACE FUNCTION reject_trade_finalization(
  p_trade_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID;
  v_from_user UUID;
  v_to_user UUID;
  v_existing_request RECORD;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get trade details
  SELECT from_user, to_user
  INTO v_from_user, v_to_user
  FROM trade_proposals
  WHERE id = p_trade_id;

  -- Validate user is a participant
  IF v_user_id NOT IN (v_from_user, v_to_user) THEN
    RAISE EXCEPTION 'User is not a participant in this trade';
  END IF;

  -- Get the pending request (should be from the OTHER user)
  SELECT * INTO v_existing_request
  FROM trade_finalizations
  WHERE trade_id = p_trade_id
    AND user_id != v_user_id
    AND status = 'pending'
  LIMIT 1;

  IF v_existing_request.user_id IS NULL THEN
    RAISE EXCEPTION 'No pending finalization request found';
  END IF;

  -- Update request to rejected
  UPDATE trade_finalizations
  SET status = 'rejected',
      rejected_at = NOW()
  WHERE trade_id = p_trade_id
    AND user_id = v_existing_request.user_id;

  RETURN jsonb_build_object(
    'status', 'rejected',
    'requester_id', v_existing_request.user_id,
    'rejecter_id', v_user_id
  );
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION request_trade_finalization(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_trade_finalization(BIGINT) TO authenticated;

REVOKE ALL ON FUNCTION reject_trade_finalization(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_trade_finalization(BIGINT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION request_trade_finalization(BIGINT) IS
  'Request trade finalization. If counterparty already requested, this accepts and completes the trade.';

COMMENT ON FUNCTION reject_trade_finalization(BIGINT) IS
  'Reject a pending finalization request from counterparty. Trade stays in accepted status.';

-- Update the trade_chats RLS to prevent messaging when finalization is pending
-- (We'll handle this in the application layer for now)
