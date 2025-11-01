-- =====================================================
-- MARKETPLACE: Add Panini metadata fields to trade_listings
-- =====================================================
-- Purpose: Store page number, page title, slot variant, and global number
--          for marketplace listings to display complete sticker metadata
-- =====================================================

-- Add Panini metadata columns to trade_listings
ALTER TABLE trade_listings
ADD COLUMN page_number INTEGER,
ADD COLUMN page_title TEXT,
ADD COLUMN slot_variant TEXT,
ADD COLUMN global_number INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN trade_listings.page_number IS 'Page number within the album/template (e.g., 12)';
COMMENT ON COLUMN trade_listings.page_title IS 'Title of the page (e.g., "Delanteros")';
COMMENT ON COLUMN trade_listings.slot_variant IS 'Variant identifier (A, B, C) for slots at same position';
COMMENT ON COLUMN trade_listings.global_number IS 'Global checklist number (e.g., 1-773 in Panini albums)';

-- Create index for global_number searches (useful for finding duplicates)
CREATE INDEX idx_trade_listings_global_number
ON trade_listings(global_number)
WHERE global_number IS NOT NULL;

-- Add check constraint to ensure variant is single uppercase letter if provided
ALTER TABLE trade_listings
ADD CONSTRAINT check_listing_variant_format
CHECK (slot_variant IS NULL OR slot_variant ~ '^[A-Z]$');
