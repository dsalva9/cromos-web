-- =====================================================
-- MARKETPLACE MVP: Extend trade_chats for listings
-- =====================================================
-- Purpose: Enable chat conversations from listings
-- Note: Both types of chat (proposals and listings) coexist
-- =====================================================

-- Add listing_id column to trade_chats
ALTER TABLE trade_chats 
ADD COLUMN listing_id BIGINT REFERENCES trade_listings(id) ON DELETE SET NULL;

-- Add comment for the new column
COMMENT ON COLUMN trade_chats.listing_id IS 'Optional: reference to listing if chat started from a listing';

-- Create index for listing_id
CREATE INDEX idx_trade_chats_listing ON trade_chats(listing_id) WHERE listing_id IS NOT NULL;

-- Add a comment explaining the relationship between proposal_id and listing_id
COMMENT ON TABLE trade_chats IS 'Chat messages for trades and listings. A chat is ABOUT a proposal OR ABOUT a listing, not both.';

-- Create RPC: get_listing_chats
-- Gets chat messages for a specific listing
CREATE OR REPLACE FUNCTION get_listing_chats(
    p_listing_id BIGINT
)
RETURNS TABLE (
    id BIGINT,
    sender_id UUID,
    sender_nickname TEXT,
    message TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_user_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get the listing owner
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;
    
    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    -- Validate user is either the listing owner or has sent a message
    IF NOT EXISTS (
        SELECT 1 FROM trade_chats 
        WHERE listing_id = p_listing_id 
        AND sender_id = auth.uid()
    ) AND auth.uid() != v_listing_user_id THEN
        RAISE EXCEPTION 'You do not have permission to view these messages';
    END IF;
    
    -- Return the chat messages
    RETURN QUERY
    SELECT 
        tc.id,
        tc.sender_id,
        p.nickname AS sender_nickname,
        tc.message,
        tc.created_at
    FROM trade_chats tc
    JOIN profiles p ON tc.sender_id = p.id
    WHERE tc.listing_id = p_listing_id
    ORDER BY tc.created_at ASC;
END;
$$;

-- Create RPC: send_listing_message
-- Sends a message in a listing chat
CREATE OR REPLACE FUNCTION send_listing_message(
    p_listing_id BIGINT,
    p_message TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_user_id UUID;
    v_message_id BIGINT;
    v_message_length INTEGER := 500;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate message is not empty
    IF TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;
    
    -- Validate message length
    IF LENGTH(p_message) > v_message_length THEN
        RAISE EXCEPTION USING ERRCODE = '22023'; -- String data right truncation
        RAISE EXCEPTION 'Message cannot be longer than 500 characters';
    END IF;
    
    -- Get the listing owner and validate listing exists and is active
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id AND status = 'active';
    
    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found or not active';
    END IF;
    
    -- Validate user is not the listing owner
    IF auth.uid() = v_listing_user_id THEN
        RAISE EXCEPTION 'You cannot send messages to your own listing';
    END IF;
    
    -- Insert the message
    INSERT INTO trade_chats (
        listing_id,
        sender_id,
        receiver_id,
        message,
        is_read
    ) VALUES (
        p_listing_id,
        auth.uid(),
        v_listing_user_id,
        p_message,
        FALSE
    ) RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_listing_chats TO authenticated;
GRANT EXECUTE ON FUNCTION send_listing_message TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_listing_chats IS 'Gets chat messages for a specific listing';
COMMENT ON FUNCTION send_listing_message IS 'Sends a message in a listing chat';