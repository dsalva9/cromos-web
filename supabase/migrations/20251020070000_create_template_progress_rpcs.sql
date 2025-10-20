-- =====================================================
-- COLLECTION TEMPLATES: Create user progress RPCs
-- =====================================================
-- Purpose: Enable users to track their progress on template copies
-- Functions: update_template_progress, get_template_progress
-- =====================================================

-- FUNCTION 1: update_template_progress
-- Updates the progress of a slot in a template copy
CREATE OR REPLACE FUNCTION update_template_progress(
    p_copy_id BIGINT,
    p_slot_id BIGINT,
    p_status TEXT,
    p_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate status is allowed
    IF p_status NOT IN ('missing', 'owned', 'duplicate') THEN
        RAISE EXCEPTION 'Status must be one of: missing, owned, duplicate';
    END IF;
    
    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies 
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Copy not found or does not belong to you';
    END IF;
    
    -- If p_status != 'duplicate', force p_count = 0
    IF p_status != 'duplicate' THEN
        p_count := 0;
    END IF;
    
    -- If p_status = 'duplicate' and p_count < 1, raise exception
    IF p_status = 'duplicate' AND p_count < 1 THEN
        RAISE EXCEPTION 'Count must be >= 1 for duplicates';
    END IF;
    
    -- UPSERT into user_template_progress
    INSERT INTO user_template_progress (user_id, copy_id, slot_id, status, count)
    VALUES (auth.uid(), p_copy_id, p_slot_id, p_status, p_count)
    ON CONFLICT (user_id, copy_id, slot_id) DO UPDATE
    SET 
        status = EXCLUDED.status,
        count = EXCLUDED.count,
        updated_at = NOW();
END;
$$;

-- FUNCTION 2: get_template_progress
-- Gets the progress of all slots in a template copy
CREATE OR REPLACE FUNCTION get_template_progress(
    p_copy_id BIGINT
)
RETURNS TABLE (
    slot_id BIGINT,
    page_id BIGINT,
    page_number INTEGER,
    slot_number INTEGER,
    label TEXT,
    is_special BOOLEAN,
    status TEXT,
    count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate copy belongs to user or is public
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies 
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Copy not found or does not belong to you';
    END IF;
    
    -- Return all template slots with progress
    RETURN QUERY
    SELECT 
        ts.id AS slot_id,
        ts.page_id AS page_id,
        tp.page_number,
        ts.slot_number,
        ts.label,
        ts.is_special,
        COALESCE(utp.status, 'missing') AS status,
        COALESCE(utp.count, 0) AS count
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON (
        utp.slot_id = ts.id 
        AND utp.copy_id = p_copy_id
        AND utp.user_id = auth.uid()
    )
    WHERE tp.template_id = (SELECT template_id FROM user_template_copies WHERE id = p_copy_id)
    ORDER BY tp.page_number, ts.slot_number;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_template_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_progress TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_template_progress IS 'Updates the progress of a slot in a template copy';
COMMENT ON FUNCTION get_template_progress IS 'Gets the progress of all slots in a template copy';