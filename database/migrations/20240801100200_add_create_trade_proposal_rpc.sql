-- =====================================================
-- Create Trade Proposal RPC Function
-- =====================================================
-- This function creates a new trade proposal with offer and request items.
-- The message is stored separately in the trade_chats table as the first message.

CREATE OR REPLACE FUNCTION public.create_trade_proposal(
  p_collection_id INTEGER,
  p_to_user UUID,
  p_offer_items public.proposal_item[],
  p_request_items public.proposal_item[],
  p_message TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_from_user_id UUID := auth.uid();
  v_proposal_id BIGINT;
  item public.proposal_item;
BEGIN
  -- 1. Validation
  IF v_from_user_id = p_to_user THEN
    RAISE EXCEPTION 'User cannot create a trade proposal with themselves.';
  END IF;

  -- Ensure the sender (current user) has a profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_from_user_id) THEN
    RAISE EXCEPTION 'Sender user does not have a profile.';
  END IF;

  -- Ensure the recipient user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_to_user) THEN
    RAISE EXCEPTION 'Recipient user does not exist.';
  END IF;

  -- Ensure both users are part of the collection
  IF NOT EXISTS (SELECT 1 FROM public.user_collections uc WHERE uc.user_id = v_from_user_id AND uc.collection_id = p_collection_id) OR
     NOT EXISTS (SELECT 1 FROM public.user_collections uc WHERE uc.user_id = p_to_user AND uc.collection_id = p_collection_id) THEN
    RAISE EXCEPTION 'Both users must be part of the specified collection.';
  END IF;

  -- 2. Insert the main proposal record (message will be in chat, not here)
  INSERT INTO public.trade_proposals (collection_id, from_user, to_user, message, status)
  VALUES (p_collection_id, v_from_user_id, p_to_user, NULL, 'pending')
  RETURNING id INTO v_proposal_id;

  -- 3. Bulk insert the "offer" items
  IF array_length(p_offer_items, 1) > 0 THEN
    INSERT INTO public.trade_proposal_items (proposal_id, sticker_id, quantity, direction)
    SELECT v_proposal_id, (UNNEST(p_offer_items)).sticker_id, (UNNEST(p_offer_items)).quantity, 'offer';
  END IF;

  -- 4. Bulk insert the "request" items
  IF array_length(p_request_items, 1) > 0 THEN
    INSERT INTO public.trade_proposal_items (proposal_id, sticker_id, quantity, direction)
    SELECT v_proposal_id, (UNNEST(p_request_items)).sticker_id, (UNNEST(p_request_items)).quantity, 'request';
  END IF;

  -- 5. If a message was provided, insert it as the first chat message
  IF p_message IS NOT NULL AND p_message <> '' THEN
    INSERT INTO public.trade_chats (trade_id, sender_id, message)
    VALUES (v_proposal_id, v_from_user_id, p_message);
  END IF;

  RETURN v_proposal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_trade_proposal(INTEGER, UUID, public.proposal_item[], public.proposal_item[], TEXT) TO authenticated;
