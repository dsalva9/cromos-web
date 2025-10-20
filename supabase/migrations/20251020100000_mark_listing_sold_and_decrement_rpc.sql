-- =====================================================
-- COLLECTION MARKETPLACE INTEGRATION: Mark listing sold and decrement
-- =====================================================
-- Purpose: Enable users to mark a listing as sold
-- If listing is from a template, increments the count in user's progress
-- =====================================================

-- FUNCTION: mark_listing_sold_and_decrement
-- Marks a listing as sold and handles template count if applicable
CREATE OR REPLACE FUNCTION mark_listing_sold_and_decrement(
    p_listing_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_copy_id BIGINT;
    v_slot_id BIGINT;
    v_status TEXT;
    v_progress_status TEXT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get listing details and validate ownership
    SELECT user_id, copy_id, slot_id, status INTO v_user_id, v_copy_id, v_slot_id, v_status
    FROM trade_listings
    WHERE id = p_listing_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Listing does not belong to you';
    END IF;
    
    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Listing is not active';
    END IF;
    
    -- Update listing status to sold
    UPDATE trade_listings
    SET status = 'sold', updated_at = NOW()
    WHERE id = p_listing_id;
    
    -- If listing is linked to a template slot, increment the count
    IF v_copy_id IS NOT NULL AND v_slot_id IS NOT NULL THEN
        -- Check if progress exists
        SELECT status INTO v_progress_status
        FROM user_template_progress
        WHERE user_id = auth.uid() AND copy_id = v_copy_id AND slot_id = v_slot_id;
        
        IF v_progress_status = 'missing' THEN
            -- Change to 'owned' with count 1
            UPDATE user_template_progress
            SET status = 'owned', count = 1, updated_at = NOW()
            WHERE user_id = auth.uid() AND copy_id = v_copy_id AND slot_id = v_slot_id;
        ELSIF v_progress_status = 'owned' THEN
            -- Change to 'duplicate' with count 1
            UPDATE user_template_progress
            SET status = 'duplicate', count = 1, updated_at = NOW()
            WHERE user_id = auth.uid() AND copy_id = v_copy_id AND slot_id = v_slot_id;
        ELSIF v_progress_status = 'duplicate' THEN
            -- Increment count
            UPDATE user_template_progress
            SET count = count + 1, updated_at = NOW()
            WHERE user_id = auth.uid() AND copy_id = v_copy_id AND slot_id = v_slot_id;
        END IF;
    END IF;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update listing';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_listing_sold_and_decrement TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION mark_listing_sold_and_decrement IS 'Marks a listing as sold and increments template count if applicable';