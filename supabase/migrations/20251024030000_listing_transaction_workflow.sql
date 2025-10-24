-- =====================================================
-- SPRINT 13: Listing Transaction Workflow
-- =====================================================
-- Purpose: Introduce reservation/completion state machine
-- - Track listing reservations
-- - Support completed transactions
-- - Enable mutual ratings
-- =====================================================

-- Update trade_listings status to include 'reserved' and 'completed'
ALTER TABLE trade_listings DROP CONSTRAINT IF EXISTS trade_listings_status_check;
ALTER TABLE trade_listings
ADD CONSTRAINT trade_listings_status_check
CHECK (status IN ('active', 'sold', 'removed', 'reserved', 'completed'));

-- Create listing_transactions table
CREATE TABLE IF NOT EXISTS listing_transactions (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES trade_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'cancelled')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint: one active transaction per listing
CREATE UNIQUE INDEX idx_listing_transactions_active
ON listing_transactions(listing_id)
WHERE status IN ('reserved', 'completed');

-- Enable RLS
ALTER TABLE listing_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own transactions"
ON listing_transactions FOR SELECT
USING (
  auth.uid() = seller_id OR
  auth.uid() = buyer_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  )
);

CREATE POLICY "Sellers can create reservations"
ON listing_transactions FOR INSERT
WITH CHECK (
  auth.uid() = seller_id AND
  EXISTS (
    SELECT 1 FROM trade_listings
    WHERE id = listing_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Participants can update transactions"
ON listing_transactions FOR UPDATE
USING (
  auth.uid() = seller_id OR auth.uid() = buyer_id
);

-- Indexes
CREATE INDEX idx_listing_transactions_listing ON listing_transactions(listing_id);
CREATE INDEX idx_listing_transactions_seller ON listing_transactions(seller_id);
CREATE INDEX idx_listing_transactions_buyer ON listing_transactions(buyer_id);
CREATE INDEX idx_listing_transactions_status ON listing_transactions(status);

-- RPC: Reserve listing for a buyer
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

  -- TODO: Log audit entry with note if provided

  RETURN v_transaction_id;
END;
$$;

-- RPC: Complete listing transaction
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
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get transaction details
  SELECT listing_id, seller_id, buyer_id
  INTO v_listing_id, v_seller_id, v_buyer_id
  FROM listing_transactions
  WHERE id = p_transaction_id AND status = 'reserved';

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

  RETURN TRUE;
END;
$$;

-- RPC: Cancel reservation
CREATE OR REPLACE FUNCTION cancel_listing_transaction(
  p_transaction_id BIGINT,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing_id BIGINT;
  v_seller_id UUID;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get transaction details
  SELECT listing_id, seller_id
  INTO v_listing_id, v_seller_id
  FROM listing_transactions
  WHERE id = p_transaction_id AND status = 'reserved';

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or already completed/cancelled';
  END IF;

  -- Only seller can cancel
  IF auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the seller can cancel a reservation';
  END IF;

  -- Update transaction
  UPDATE listing_transactions
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Revert listing to active
  UPDATE trade_listings
  SET status = 'active'
  WHERE id = v_listing_id;

  RETURN TRUE;
END;
$$;

-- RPC: Get listing transaction info
CREATE OR REPLACE FUNCTION get_listing_transaction(
  p_listing_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
  listing_id BIGINT,
  seller_id UUID,
  buyer_id UUID,
  seller_nickname TEXT,
  buyer_nickname TEXT,
  status TEXT,
  reserved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT
    lt.id,
    lt.listing_id,
    lt.seller_id,
    lt.buyer_id,
    sp.nickname AS seller_nickname,
    bp.nickname AS buyer_nickname,
    lt.status,
    lt.reserved_at,
    lt.completed_at,
    lt.cancelled_at
  FROM listing_transactions lt
  JOIN profiles sp ON lt.seller_id = sp.id
  JOIN profiles bp ON lt.buyer_id = bp.id
  WHERE lt.listing_id = p_listing_id
  AND (lt.seller_id = auth.uid() OR lt.buyer_id = auth.uid())
  ORDER BY lt.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reserve_listing TO authenticated;
GRANT EXECUTE ON FUNCTION complete_listing_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_listing_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_transaction TO authenticated;

-- Comments
COMMENT ON TABLE listing_transactions IS 'Tracks marketplace listing reservations and completions';
COMMENT ON FUNCTION reserve_listing IS 'Reserve a listing for a specific buyer (seller only)';
COMMENT ON FUNCTION complete_listing_transaction IS 'Mark a transaction as completed (seller or buyer)';
COMMENT ON FUNCTION cancel_listing_transaction IS 'Cancel a reservation and revert listing to active (seller only)';
COMMENT ON FUNCTION get_listing_transaction IS 'Get transaction details for a listing';

-- TODO Sprint 13 (future): Add rating system integration
-- TODO Sprint 15: Add notification triggers for status changes
