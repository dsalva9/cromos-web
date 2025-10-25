-- =====================================================
-- Add receiver_id column to trade_chats
-- =====================================================
-- Purpose: Support bidirectional chat conversations
-- Date: 2025-10-25
-- =====================================================

-- Add receiver_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trade_chats' AND column_name = 'receiver_id'
    ) THEN
        ALTER TABLE trade_chats ADD COLUMN receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_trade_chats_receiver_id ON trade_chats(receiver_id);
        COMMENT ON COLUMN trade_chats.receiver_id IS 'User who receives the message (for bidirectional chat)';
    END IF;
END $$;

-- Add is_read column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trade_chats' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE trade_chats ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL;
        CREATE INDEX idx_trade_chats_is_read ON trade_chats(receiver_id, is_read) WHERE is_read = FALSE;
        COMMENT ON COLUMN trade_chats.is_read IS 'Whether the message has been read by the receiver';
    END IF;
END $$;
