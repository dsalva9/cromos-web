-- =====================================================
-- CREATE: update_trade_listing function
-- =====================================================
-- Purpose: Update an existing marketplace listing
-- =====================================================

-- FUNCTION: update_trade_listing
-- Updates an existing marketplace listing
CREATE FUNCTION update_trade_listing(
    p_listing_id BIGINT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_sticker_number TEXT DEFAULT NULL,
    p_collection_name TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to update a listing';
    END IF;
    
    -- Get the listing owner
    SELECT user_id INTO v_user_id
    FROM trade_listings
    WHERE id = p_listing_id;
    
    -- Check if listing exists and user is the owner
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only update your own listings';
    END IF;
    
    -- Update the listing
    UPDATE trade_listings
    SET 
        title = p_title,
        description = p_description,
        sticker_number = p_sticker_number,
        collection_name = p_collection_name,
        image_url = p_image_url,
        updated_at = NOW()
    WHERE id = p_listing_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_trade_listing TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_trade_listing IS 'Updates an existing marketplace listing';