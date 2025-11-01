-- =====================================================
-- MARKETPLACE: Update get_my_listings_with_progress with Panini fields
-- =====================================================
-- Purpose: Include Panini metadata in my listings view
-- =====================================================

CREATE OR REPLACE FUNCTION get_my_listings_with_progress(
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    -- Template information
    copy_id BIGINT,
    copy_title TEXT,
    template_title TEXT,
    page_number INTEGER,
    slot_number INTEGER,
    slot_label TEXT,
    -- Sync information
    current_status TEXT,
    current_count INTEGER,
    sync_status TEXT,
    -- Panini metadata from trade_listings
    page_title TEXT,
    slot_variant TEXT,
    global_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        -- Template information
        utc.id AS copy_id,
        utc.title AS copy_title,
        ct.title AS template_title,
        tp.page_number,
        ts.slot_number,
        ts.label AS slot_label,
        -- Sync information
        COALESCE(utp.status, 'missing') AS current_status,
        COALESCE(utp.count, 0) AS current_count,
        CASE
            -- If listing is not linked to a template, no sync needed
            WHEN tl.copy_id IS NULL OR tl.slot_id IS NULL THEN 'not_applicable'
            -- If listing is active but slot is not duplicate, out of sync
            WHEN tl.status = 'active' AND COALESCE(utp.status, 'missing') != 'duplicate' THEN 'out_of_sync'
            -- If listing is sold but slot doesn't reflect it, out of sync
            WHEN tl.status = 'sold' AND (
                -- Check if slot count reflects the sale
                COALESCE(utp.status, 'missing') = 'missing' OR
                (COALESCE(utp.status, 'missing') = 'owned' AND COALESCE(utp.count, 0) = 0) OR
                (COALESCE(utp.status, 'missing') = 'duplicate' AND COALESCE(utp.count, 0) = 0)
            ) THEN 'out_of_sync'
            -- Otherwise, in sync
            ELSE 'in_sync'
        END AS sync_status,
        -- Panini metadata from trade_listings (not template_pages to show what was saved)
        tl.page_title,
        tl.slot_variant,
        tl.global_number
    FROM trade_listings tl
    LEFT JOIN user_template_copies utc ON tl.copy_id = utc.id
    LEFT JOIN collection_templates ct ON utc.template_id = ct.id
    LEFT JOIN template_slots ts ON tl.slot_id = ts.id
    LEFT JOIN template_pages tp ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON (
        utp.copy_id = tl.copy_id
        AND utp.slot_id = tl.slot_id
        AND utp.user_id = tl.user_id
    )
    WHERE tl.user_id = auth.uid()
    AND (p_status IS NULL OR tl.status = p_status)
    ORDER BY tl.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_listings_with_progress TO authenticated;

COMMENT ON FUNCTION get_my_listings_with_progress IS 'Gets user''s listings with optional template progress information and Panini metadata';
