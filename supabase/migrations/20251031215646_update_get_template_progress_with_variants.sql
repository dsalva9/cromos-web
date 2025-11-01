-- =====================================================
-- Update get_template_progress to include new Panini fields
-- =====================================================
-- Purpose: Add slot_variant, global_number, and page_title to progress RPC
-- =====================================================

CREATE OR REPLACE FUNCTION get_template_progress(
    p_copy_id BIGINT
)
RETURNS TABLE (
    slot_id BIGINT,
    page_id BIGINT,
    page_number INTEGER,
    page_title TEXT,
    slot_number INTEGER,
    slot_variant TEXT,
    global_number INTEGER,
    label TEXT,
    is_special BOOLEAN,
    status TEXT,
    count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Copy not found or does not belong to you';
    END IF;

    -- Return all template slots with progress including new fields
    RETURN QUERY
    SELECT
        ts.id AS slot_id,
        ts.page_id AS page_id,
        tp.page_number,
        tp.title AS page_title,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number,
        ts.label,
        ts.is_special,
        COALESCE(utp.status, 'missing') AS status,
        COALESCE(utp.count, 0) AS count
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON (
        utp.slot_id = ts.id
        AND utp.copy_id = p_copy_id
    )
    WHERE tp.template_id = (
        SELECT template_id FROM user_template_copies WHERE id = p_copy_id
    )
    ORDER BY tp.page_number, ts.slot_number, ts.slot_variant NULLS FIRST;
END;
$$;
