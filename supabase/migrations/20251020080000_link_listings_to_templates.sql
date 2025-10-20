-- =====================================================
-- COLLECTION MARKETPLACE INTEGRATION: Link listings to templates
-- =====================================================
-- Purpose: Enable listings to reference template copies and slots
-- Note: Listings can be standalone or linked to a template slot
-- =====================================================

-- Add template reference columns to trade_listings
ALTER TABLE trade_listings 
ADD COLUMN copy_id BIGINT REFERENCES user_template_copies(id) ON DELETE SET NULL,
ADD COLUMN slot_id BIGINT REFERENCES template_slots(id) ON DELETE SET NULL;

-- Add comments for the new columns
COMMENT ON COLUMN trade_listings.copy_id IS 'Optional: reference to user''s template copy if listing is from a template';
COMMENT ON COLUMN trade_listings.slot_id IS 'Optional: reference to specific slot if listing is from a template';

-- Create indices for the new columns
CREATE INDEX idx_listings_copy ON trade_listings(copy_id) WHERE copy_id IS NOT NULL;
CREATE INDEX idx_listings_slot ON trade_listings(slot_id) WHERE slot_id IS NOT NULL;

-- Add a comment explaining the relationship
COMMENT ON TABLE trade_listings IS 'Marketplace listings for physical cards. Can be standalone or linked to a template slot.';

-- Create a view to get listings with template information
CREATE OR REPLACE VIEW listings_with_template_info AS
SELECT 
    tl.id,
    tl.user_id,
    tl.title,
    tl.description,
    tl.sticker_number,
    tl.collection_name,
    tl.image_url,
    tl.status,
    tl.views_count,
    tl.created_at,
    tl.updated_at,
    -- Template information
    utc.id AS copy_id,
    utc.title AS copy_title,
    ct.title AS template_title,
    ct.author_id AS template_author_id,
    p.nickname AS template_author_nickname,
    ts.page_id,
    template_pages.page_number,
    ts.slot_number,
    ts.label AS slot_label,
    utp.status AS slot_status,
    utp.count AS slot_count
FROM trade_listings tl
LEFT JOIN user_template_copies utc ON tl.copy_id = utc.id
LEFT JOIN collection_templates ct ON utc.template_id = ct.id
LEFT JOIN profiles p ON ct.author_id = p.id
LEFT JOIN template_slots ts ON tl.slot_id = ts.id
LEFT JOIN template_pages ON ts.page_id = template_pages.id
LEFT JOIN user_template_progress utp ON (
    utp.copy_id = tl.copy_id 
    AND utp.slot_id = tl.slot_id
    AND utp.user_id = tl.user_id
);

-- Add comment for the view
COMMENT ON VIEW listings_with_template_info IS 'View of listings with optional template information';