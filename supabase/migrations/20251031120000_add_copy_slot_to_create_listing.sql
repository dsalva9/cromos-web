-- =====================================================
-- ADD COPY_ID AND SLOT_ID TO CREATE LISTING
-- =====================================================
-- Purpose: Allow linking listings to template copies/slots when created via combobox
-- =====================================================

-- Drop and recreate function with copy_id and slot_id parameters
DROP FUNCTION IF EXISTS create_trade_listing(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_trade_listing(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_sticker_number TEXT DEFAULT NULL,
    p_collection_name TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_copy_id BIGINT DEFAULT NULL,
    p_slot_id BIGINT DEFAULT NULL
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

    -- Insert the listing
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        sticker_number,
        collection_name,
        image_url,
        copy_id,
        slot_id,
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
        'active'
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_trade_listing(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;

COMMENT ON FUNCTION create_trade_listing IS 'Creates a new marketplace listing with optional template copy/slot linking for sync tracking';
