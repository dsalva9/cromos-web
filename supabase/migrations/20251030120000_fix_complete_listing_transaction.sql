-- =====================================================
-- Fix complete_listing_transaction workflow
-- =====================================================
-- Purpose: Add pending_completion status for two-step workflow
-- Seller marks complete -> status becomes 'pending_completion'
-- Buyer confirms -> status becomes 'completed'
-- =====================================================

-- Update listing_transactions to support pending_completion status
ALTER TABLE listing_transactions DROP CONSTRAINT IF EXISTS listing_transactions_status_check;
ALTER TABLE listing_transactions
ADD CONSTRAINT listing_transactions_status_check
CHECK (status IN ('reserved', 'pending_completion', 'completed', 'cancelled'));

-- Update complete_listing_transaction with proper two-step workflow
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

  -- If not reserved or pending_completion, can't complete
  IF v_current_status != 'reserved' AND v_current_status != 'pending_completion' THEN
    RAISE EXCEPTION 'Transaction must be in reserved or pending_completion status to complete';
  END IF;

  -- Validate caller is either seller or buyer
  IF auth.uid() != v_seller_id AND auth.uid() != v_buyer_id THEN
    RAISE EXCEPTION 'Only transaction participants can complete it';
  END IF;

  -- Get nicknames for messages
  SELECT nickname INTO v_seller_nickname FROM profiles WHERE id = v_seller_id;
  SELECT nickname INTO v_buyer_nickname FROM profiles WHERE id = v_buyer_id;

  -- If seller is initiating completion
  IF auth.uid() = v_seller_id THEN
    -- Update status to pending_completion
    UPDATE listing_transactions
    SET
      status = 'pending_completion',
      updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Send targeted messages
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

    RETURN TRUE;
  END IF;

  -- If buyer is confirming completion
  IF auth.uid() = v_buyer_id THEN
    -- Can only confirm if status is pending_completion
    IF v_current_status != 'pending_completion' THEN
      RAISE EXCEPTION 'Transaction must be marked complete by seller first';
    END IF;

    -- Update transaction to completed
    UPDATE listing_transactions
    SET
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Update listing to completed
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

GRANT EXECUTE ON FUNCTION complete_listing_transaction(BIGINT) TO authenticated;

COMMENT ON FUNCTION complete_listing_transaction IS 'Two-step completion: seller initiates (pending_completion), buyer confirms (completed)';
