-- =====================================================
-- MARKETPLACE: Update publish_duplicate_to_marketplace with Panini fields
-- =====================================================
-- Purpose: Automatically populate Panini metadata when publishing from template
-- =====================================================

-- Drop and recreate function with Panini field support
DROP FUNCTION IF EXISTS publish_duplicate_to_marketplace(BIGINT, BIGINT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION publish_duplicate_to_marketplace(
    p_copy_id BIGINT,
    p_slot_id BIGINT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id BIGINT;
    v_user_id UUID;
    v_template_id BIGINT;
    v_current_count INTEGER;
    v_copy_user_id UUID;
    v_slot_status TEXT;
    v_page_number INTEGER;
    v_page_title TEXT;
    v_slot_number INTEGER;
    v_slot_variant TEXT;
    v_global_number INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate title is not empty
    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;

    -- Validate copy belongs to user and get details
    SELECT user_id, template_id INTO v_copy_user_id, v_template_id
    FROM user_template_copies
    WHERE id = p_copy_id;

    IF v_copy_user_id IS NULL THEN
        RAISE EXCEPTION 'Copy not found';
    END IF;

    IF v_copy_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Copy does not belong to you';
    END IF;

    -- Get slot metadata including Panini fields
    SELECT
        tp.page_number,
        tp.title,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number
    INTO
        v_page_number,
        v_page_title,
        v_slot_number,
        v_slot_variant,
        v_global_number
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    WHERE ts.id = p_slot_id AND tp.template_id = v_template_id;

    IF v_slot_number IS NULL THEN
        RAISE EXCEPTION 'Slot does not belong to this template';
    END IF;

    -- Get current progress for this slot
    SELECT status, count INTO v_slot_status, v_current_count
    FROM user_template_progress
    WHERE user_id = auth.uid() AND copy_id = p_copy_id AND slot_id = p_slot_id;

    IF v_slot_status IS NULL THEN
        RAISE EXCEPTION 'Slot progress not found';
    END IF;

    IF v_slot_status != 'duplicate' OR v_current_count < 1 THEN
        RAISE EXCEPTION 'No duplicates available for this slot';
    END IF;

    -- Create the listing with Panini metadata
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        image_url,
        status,
        copy_id,
        slot_id,
        sticker_number,
        page_number,
        page_title,
        slot_variant,
        global_number
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_image_url,
        'active',
        p_copy_id,
        p_slot_id,
        CONCAT(v_slot_number::TEXT, COALESCE(v_slot_variant, '')), -- Combine number and variant for sticker_number
        v_page_number,
        v_page_title,
        v_slot_variant,
        v_global_number
    ) RETURNING id INTO v_listing_id;

    -- Decrement the duplicate count
    IF v_current_count = 1 THEN
        -- Change status to 'owned' if this was the last duplicate
        UPDATE user_template_progress
        SET status = 'owned', count = 0, updated_at = NOW()
        WHERE user_id = auth.uid() AND copy_id = p_copy_id AND slot_id = p_slot_id;
    ELSE
        -- Decrement count
        UPDATE user_template_progress
        SET count = count - 1, updated_at = NOW()
        WHERE user_id = auth.uid() AND copy_id = p_copy_id AND slot_id = p_slot_id;
    END IF;

    RETURN v_listing_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION publish_duplicate_to_marketplace TO authenticated;

COMMENT ON FUNCTION publish_duplicate_to_marketplace IS 'Creates a marketplace listing from a template duplicate with Panini metadata and decrements the count';
