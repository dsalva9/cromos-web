-- =====================================================
-- Fix get_template_copy_slots column names
-- =====================================================
-- Purpose: Align RPC column names with TypeScript interface
-- Changes: label -> slot_label, status -> user_status, count -> user_count
-- =====================================================

CREATE OR REPLACE FUNCTION get_template_copy_slots(p_copy_id BIGINT)
RETURNS TABLE (
    slot_id BIGINT,
    page_id BIGINT,
    page_number INTEGER,
    page_title TEXT,
    page_type TEXT,
    slot_number INTEGER,
    slot_variant TEXT,
    global_number INTEGER,
    slot_label TEXT,
    is_special BOOLEAN,
    user_status TEXT,
    user_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template copy not found or you do not have permission';
    END IF;

    RETURN QUERY
    SELECT
        ts.id AS slot_id,
        tp.id AS page_id,
        tp.page_number,
        tp.title AS page_title,
        tp.type AS page_type,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number,
        ts.label AS slot_label,
        ts.is_special,
        COALESCE(utp.status, 'missing') AS user_status,
        COALESCE(utp.count, 0) AS user_count
    FROM user_template_copies utc
    JOIN collection_templates ct ON ct.id = utc.template_id
    JOIN template_pages tp ON tp.template_id = ct.id
    JOIN template_slots ts ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id
        AND utp.copy_id = utc.id
        AND utp.user_id = auth.uid()
    WHERE utc.id = p_copy_id
    ORDER BY tp.page_number, ts.slot_number, ts.slot_variant NULLS FIRST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_template_copy_slots TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_template_copy_slots IS 'Gets all slots for a template copy with user progress, including variants and global numbers. Returns column names matching TypeScript interface.';
