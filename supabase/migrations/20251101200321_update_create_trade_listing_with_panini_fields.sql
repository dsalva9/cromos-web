-- =====================================================
-- MARKETPLACE: Update create_trade_listing RPC with Panini fields
-- =====================================================
-- Purpose: Accept and store Panini metadata when creating listings
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS create_trade_listing(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT);

-- Recreate with Panini fields
CREATE OR REPLACE FUNCTION create_trade_listing(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_sticker_number TEXT DEFAULT NULL,
    p_collection_name TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_copy_id BIGINT DEFAULT NULL,
    p_slot_id BIGINT DEFAULT NULL,
    p_page_number INTEGER DEFAULT NULL,
    p_page_title TEXT DEFAULT NULL,
    p_slot_variant TEXT DEFAULT NULL,
    p_global_number INTEGER DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id BIGINT;
    v_user_id UUID;
BEGIN
    -- Validate user is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a listing';
    END IF;

    -- Validate title is not empty
    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;

    -- If copy_id is provided, verify user owns it
    IF p_copy_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_template_copies
            WHERE id = p_copy_id AND user_id = v_user_id
        ) THEN
            RAISE EXCEPTION 'Template copy not found or access denied';
        END IF;
    END IF;

    -- Insert the listing with Panini fields
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        sticker_number,
        collection_name,
        image_url,
        copy_id,
        slot_id,
        page_number,
        page_title,
        slot_variant,
        global_number,
        status
    ) VALUES (
        v_user_id,
        p_title,
        p_description,
        p_sticker_number,
        p_collection_name,
        p_image_url,
        p_copy_id,
        p_slot_id,
        p_page_number,
        p_page_title,
        p_slot_variant,
        p_global_number,
        'active'
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_trade_listing(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, INTEGER, TEXT, TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION create_trade_listing IS 'Creates a new marketplace listing with optional template linking and Panini metadata (page, variant, global number)';
