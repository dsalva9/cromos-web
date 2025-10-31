-- =====================================================
-- FIX: admin_list_templates type mismatch
-- =====================================================
-- Purpose: Fix integer/bigint type mismatch in copies_count column
-- Error: "Returned type integer does not match expected type bigint in column 8"
-- =====================================================

DROP FUNCTION IF EXISTS admin_list_templates(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION admin_list_templates(
    p_status TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_nickname TEXT,
    rating_avg DECIMAL,
    rating_count BIGINT,
    copies_count BIGINT,  -- Changed from INTEGER to BIGINT
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        COALESCE(ct.status, 'active') AS status,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.rating_avg,
        ct.rating_count,
        ct.copies_count::BIGINT,  -- Cast to BIGINT to match return type
        ct.is_public
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE
        (p_status IS NULL OR COALESCE(ct.status, 'active') = p_status)
        AND (p_query IS NULL OR ct.title ILIKE '%' || p_query || '%')
    ORDER BY ct.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_list_templates(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_list_templates IS 'Returns paginated templates for admin oversight (with fixed type casting)';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test as admin:
-- SELECT * FROM admin_list_templates(NULL, NULL, 1, 20);
