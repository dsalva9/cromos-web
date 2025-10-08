-- Migration: Fix create_trade_proposal RPC
-- Description: Remove ON CONFLICT clause from chat message insert since there's no unique constraint
-- Version: v1.4.4 hotfix
-- Date: 2025-10-08

-- Drop and recreate the create_trade_proposal function without ON CONFLICT
DROP FUNCTION IF EXISTS create_trade_proposal(INTEGER, UUID, proposal_item[], proposal_item[], TEXT);

CREATE OR REPLACE FUNCTION create_trade_proposal(
  p_collection_id INTEGER,
  p_to_user UUID,
  p_offer_items proposal_item[],
  p_request_items proposal_item[],
  p_message TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_proposal_id BIGINT;
  v_from_user UUID;
  v_item proposal_item;
BEGIN
  -- Get authenticated user
  v_from_user := auth.uid();

  IF v_from_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate user is not sending to themselves
  IF v_from_user = p_to_user THEN
    RAISE EXCEPTION 'Cannot send proposal to yourself';
  END IF;

  -- Validate arrays are not empty
  IF array_length(p_offer_items, 1) IS NULL OR array_length(p_request_items, 1) IS NULL THEN
    RAISE EXCEPTION 'Both offer and request items are required';
  END IF;

  -- Create the proposal (message is always NULL in the proposal record)
  INSERT INTO trade_proposals (
    collection_id,
    from_user,
    to_user,
    status,
    message,
    created_at,
    updated_at
  ) VALUES (
    p_collection_id,
    v_from_user,
    p_to_user,
    'pending',
    NULL,  -- Always NULL - messages go to trade_chats
    NOW(),
    NOW()
  ) RETURNING id INTO v_proposal_id;

  -- Insert offer items
  FOREACH v_item IN ARRAY p_offer_items
  LOOP
    INSERT INTO trade_proposal_items (
      proposal_id,
      sticker_id,
      quantity,
      direction
    ) VALUES (
      v_proposal_id,
      v_item.sticker_id,
      v_item.quantity,
      'offer'
    );
  END LOOP;

  -- Insert request items
  FOREACH v_item IN ARRAY p_request_items
  LOOP
    INSERT INTO trade_proposal_items (
      proposal_id,
      sticker_id,
      quantity,
      direction
    ) VALUES (
      v_proposal_id,
      v_item.sticker_id,
      v_item.quantity,
      'request'
    );
  END LOOP;

  -- Insert initial message if provided (simple INSERT, no ON CONFLICT)
  IF p_message IS NOT NULL AND trim(p_message) <> '' THEN
    INSERT INTO trade_chats (
      trade_id,
      sender_id,
      message,
      created_at
    ) VALUES (
      v_proposal_id,
      v_from_user,
      trim(p_message),
      NOW()
    );
  END IF;

  RETURN v_proposal_id;
END;
$$;

-- Revoke default permissions and grant to authenticated users only
REVOKE ALL ON FUNCTION create_trade_proposal(INTEGER, UUID, proposal_item[], proposal_item[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_trade_proposal(INTEGER, UUID, proposal_item[], proposal_item[], TEXT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION create_trade_proposal(INTEGER, UUID, proposal_item[], proposal_item[], TEXT) IS
  'Creates a new trade proposal with offer and request items. Optional message is stored as first chat message. Returns proposal ID.';
