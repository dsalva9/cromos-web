-- =====================================================
-- Fix complete_listing_transaction to send notifications
-- =====================================================
-- Purpose: Update complete_listing_transaction RPC to notify buyer
--          when seller marks listing as completed
-- =====================================================

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
  v_listing_title TEXT;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get transaction details
  SELECT lt.listing_id, lt.seller_id, lt.buyer_id, tl.title
  INTO v_listing_id, v_seller_id, v_buyer_id, v_listing_title
  FROM listing_transactions lt
  JOIN trade_listings tl ON tl.id = lt.listing_id
  WHERE lt.id = p_transaction_id AND lt.status = 'reserved';

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or already completed/cancelled';
  END IF;

  -- Validate caller is either seller or buyer
  IF auth.uid() != v_seller_id AND auth.uid() != v_buyer_id THEN
    RAISE EXCEPTION 'Only transaction participants can complete it';
  END IF;

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

  -- Send notification to buyer (only if seller initiated completion)
  IF auth.uid() = v_seller_id THEN
    PERFORM notify_listing_event(
      p_listing_id := v_listing_id,
      p_kind := 'listing_completed',
      p_actor_id := v_seller_id,
      p_recipient_id := v_buyer_id,
      p_payload := jsonb_build_object(
        'listing_title', v_listing_title,
        'completed_at', NOW(),
        'needs_confirmation', TRUE
      )
    );
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION complete_listing_transaction IS
'Mark a transaction as completed. Seller initiates and buyer receives notification to confirm.';
