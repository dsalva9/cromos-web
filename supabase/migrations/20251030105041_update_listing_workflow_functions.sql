-- =====================================================
-- Update listing workflow functions for better UX
-- =====================================================
-- Purpose: Update reserve/complete/unreserve flows
-- with context-aware system messages
-- =====================================================

-- Update reserve_listing to use the new message system
DROP FUNCTION IF EXISTS reserve_listing(BIGINT, UUID, TEXT);

CREATE OR REPLACE FUNCTION reserve_listing(
  p_listing_id BIGINT,
  p_buyer_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id UUID;
  v_transaction_id BIGINT;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get listing owner
  SELECT user_id INTO v_seller_id
  FROM trade_listings
  WHERE id = p_listing_id AND status = 'active';

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found or not active';
  END IF;

  -- Validate caller is the seller
  IF auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the listing owner can reserve it';
  END IF;

  -- Validate buyer exists and is not seller
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_buyer_id) THEN
    RAISE EXCEPTION 'Buyer not found';
  END IF;

  IF p_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Cannot reserve listing for yourself';
  END IF;

  -- Create transaction
  INSERT INTO listing_transactions (
    listing_id,
    seller_id,
    buyer_id,
    status
  ) VALUES (
    p_listing_id,
    v_seller_id,
    p_buyer_id,
    'reserved'
  ) RETURNING id INTO v_transaction_id;

  -- Update listing status
  UPDATE trade_listings
  SET status = 'reserved'
  WHERE id = p_listing_id;

  -- Send context-aware messages to all participants
  PERFORM add_listing_status_messages(p_listing_id, p_buyer_id, 'reserved');

  RETURN v_transaction_id;
END;
$$;

-- Create unreserve_listing function (alias for cancel with better UX)
CREATE OR REPLACE FUNCTION unreserve_listing(
  p_listing_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id BIGINT;
  v_seller_id UUID;
  v_buyer_id UUID;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get active transaction for this listing
  SELECT lt.id, lt.seller_id, lt.buyer_id
  INTO v_transaction_id, v_seller_id, v_buyer_id
  FROM listing_transactions lt
  WHERE lt.listing_id = p_listing_id
  AND lt.status = 'reserved';

  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'No active reservation found for this listing';
  END IF;

  -- Only seller can unreserve
  IF auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the seller can unreserve a listing';
  END IF;

  -- Update transaction to cancelled
  UPDATE listing_transactions
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Unreserved by seller',
    updated_at = NOW()
  WHERE id = v_transaction_id;

  -- Revert listing to active
  UPDATE trade_listings
  SET status = 'active'
  WHERE id = p_listing_id;

  -- Send context-aware messages to all participants
  PERFORM add_listing_status_messages(p_listing_id, NULL, 'unreserved');

  RETURN TRUE;
END;
$$;

-- Update complete_listing_transaction to use context-aware messages
DROP FUNCTION IF EXISTS complete_listing_transaction(BIGINT);

CREATE OR REPLACE FUNCTION complete_listing_transaction(
  p_transaction_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing_id BIGINT;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_seller_nickname TEXT;
  v_buyer_nickname TEXT;
  v_current_status TEXT;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get transaction details
  SELECT lt.listing_id, lt.seller_id, lt.buyer_id, lt.status
  INTO v_listing_id, v_seller_id, v_buyer_id, v_current_status
  FROM listing_transactions lt
  WHERE lt.id = p_transaction_id;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- If already completed, this is idempotent - just return true
  IF v_current_status = 'completed' THEN
    RETURN TRUE;
  END IF;

  -- If not reserved, can't complete
  IF v_current_status != 'reserved' THEN
    RAISE EXCEPTION 'Transaction must be in reserved status to complete';
  END IF;

  -- Validate caller is either seller or buyer
  IF auth.uid() != v_seller_id AND auth.uid() != v_buyer_id THEN
    RAISE EXCEPTION 'Only transaction participants can complete it';
  END IF;

  -- Get nicknames for messages
  SELECT nickname INTO v_seller_nickname FROM profiles WHERE id = v_seller_id;
  SELECT nickname INTO v_buyer_nickname FROM profiles WHERE id = v_buyer_id;

  -- If seller is completing, send waiting message to buyer
  IF auth.uid() = v_seller_id THEN
    PERFORM add_system_message_to_listing_chat(
      v_listing_id,
      v_seller_nickname || ' ha marcado el intercambio como completado. Esperando tu confirmación.',
      v_buyer_id
    );

    PERFORM add_system_message_to_listing_chat(
      v_listing_id,
      'Has marcado el intercambio como completado. Esperando confirmación de ' || v_buyer_nickname || '.',
      v_seller_id
    );

    -- Don't change status yet - waiting for buyer
    RETURN TRUE;
  END IF;

  -- If buyer is confirming, complete the transaction
  IF auth.uid() = v_buyer_id THEN
    -- Update transaction
    UPDATE listing_transactions
    SET
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Update listing
    UPDATE trade_listings
    SET status = 'completed'
    WHERE id = v_listing_id;

    -- Send completion messages to all participants
    PERFORM add_listing_status_messages(v_listing_id, v_buyer_id, 'completed');

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reserve_listing(BIGINT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unreserve_listing(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_listing_transaction(BIGINT) TO authenticated;

-- Comments
COMMENT ON FUNCTION reserve_listing IS 'Reserve a listing for a specific buyer with context-aware messages (seller only)';
COMMENT ON FUNCTION unreserve_listing IS 'Unreserve a listing and return it to active status (seller only)';
COMMENT ON FUNCTION complete_listing_transaction IS 'Mark a transaction as completed with proper workflow (seller initiates, buyer confirms)';
