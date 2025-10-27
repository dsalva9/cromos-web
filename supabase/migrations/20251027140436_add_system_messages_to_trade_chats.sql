-- =====================================================
-- Add system message support to trade_chats
-- =====================================================
-- Purpose: Allow system-generated messages in chat
-- (e.g., "User X marked listing as reserved")
-- =====================================================

-- Add is_system column to distinguish system messages from user messages
ALTER TABLE trade_chats
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE NOT NULL;

-- For system messages, sender_id and receiver_id can be NULL
-- Update the existing constraints to allow this
ALTER TABLE trade_chats
ALTER COLUMN sender_id DROP NOT NULL;

ALTER TABLE trade_chats
ALTER COLUMN receiver_id DROP NOT NULL;

-- Add constraint: if is_system is false, sender_id and receiver_id must be set
-- if is_system is true, they can be NULL
ALTER TABLE trade_chats
DROP CONSTRAINT IF EXISTS trade_chats_user_message_requires_users;

ALTER TABLE trade_chats
ADD CONSTRAINT trade_chats_user_message_requires_users
CHECK (
  (is_system = FALSE AND sender_id IS NOT NULL AND receiver_id IS NOT NULL) OR
  (is_system = TRUE)
);

-- Create helper function to add system message
CREATE OR REPLACE FUNCTION add_system_message_to_listing_chat(
    p_listing_id BIGINT,
    p_message TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_message_id BIGINT;
BEGIN
    -- Insert system message
    INSERT INTO trade_chats (
        listing_id,
        message,
        is_system,
        is_read
    ) VALUES (
        p_listing_id,
        p_message,
        TRUE,
        TRUE  -- System messages are auto-read
    ) RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_system_message_to_listing_chat(BIGINT, TEXT) TO authenticated;

COMMENT ON FUNCTION add_system_message_to_listing_chat IS 'Add a system-generated message to a listing chat';
COMMENT ON COLUMN trade_chats.is_system IS 'TRUE for system messages, FALSE for user messages';
