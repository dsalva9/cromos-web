-- =====================================================
-- MARKETPLACE MVP: Create trade_listings table
-- =====================================================
-- Purpose: Enable users to publish physical card listings
-- Model: Wallapop-style marketplace with free-form fields
-- =====================================================

-- Create trade_listings table
CREATE TABLE trade_listings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed')),
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX idx_listings_user ON trade_listings(user_id);
CREATE INDEX idx_listings_status ON trade_listings(status) WHERE status = 'active';
CREATE INDEX idx_listings_created ON trade_listings(created_at DESC);

-- Create GIN index for full-text search
CREATE INDEX idx_listings_search ON trade_listings USING GIN (to_tsvector('english', title || ' ' || COALESCE(collection_name, '')));

-- Add comments for documentation
COMMENT ON TABLE trade_listings IS 'Marketplace listings for physical trading cards';
COMMENT ON COLUMN trade_listings.user_id IS 'Owner of the listing';
COMMENT ON COLUMN trade_listings.title IS 'Listing title (e.g., "Messi Inter Miami 2024")';
COMMENT ON COLUMN trade_listings.description IS 'Free description of the card';
COMMENT ON COLUMN trade_listings.sticker_number IS 'Card number (free text)';
COMMENT ON COLUMN trade_listings.collection_name IS 'Collection name (free text)';
COMMENT ON COLUMN trade_listings.image_url IS 'Real photo URL in Storage';
COMMENT ON COLUMN trade_listings.status IS 'Listing status: active, sold, removed';
COMMENT ON COLUMN trade_listings.views_count IS 'Number of times listing was viewed';

-- Enable RLS (Row Level Security)
ALTER TABLE trade_listings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Public read for active listings
CREATE POLICY "Public read access for active listings" ON trade_listings
    FOR SELECT USING (status = 'active');

-- 2. Users can insert only their own listings
CREATE POLICY "Users can create their own listings" ON trade_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users can update/delete only their own listings
CREATE POLICY "Users can update their own listings" ON trade_listings
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Users can delete only their own listings
CREATE POLICY "Users can delete their own listings" ON trade_listings
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Admins can do anything
CREATE POLICY "Admins have full access" ON trade_listings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Create trigger for updated_at
CREATE TRIGGER update_trade_listings_updated_at
    BEFORE UPDATE ON trade_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();