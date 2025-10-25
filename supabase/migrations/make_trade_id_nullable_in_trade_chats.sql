-- =====================================================
-- Make trade_id nullable in trade_chats
-- =====================================================
-- Purpose: Allow trade_chats to be used for EITHER trades OR listings
-- Date: 2025-10-25
-- =====================================================

-- Remove NOT NULL constraint from trade_id since chats can be for listings too
ALTER TABLE trade_chats ALTER COLUMN trade_id DROP NOT NULL;

-- Add a check constraint to ensure either trade_id OR listing_id is set (but not both)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'trade_chats_either_trade_or_listing'
    ) THEN
        ALTER TABLE trade_chats DROP CONSTRAINT trade_chats_either_trade_or_listing;
    END IF;

    -- Add new constraint
    ALTER TABLE trade_chats ADD CONSTRAINT trade_chats_either_trade_or_listing
        CHECK (
            (trade_id IS NOT NULL AND listing_id IS NULL) OR
            (trade_id IS NULL AND listing_id IS NOT NULL)
        );
END $$;

COMMENT ON CONSTRAINT trade_chats_either_trade_or_listing ON trade_chats IS
    'Ensures each chat message belongs to either a trade proposal OR a listing, but not both or neither';
