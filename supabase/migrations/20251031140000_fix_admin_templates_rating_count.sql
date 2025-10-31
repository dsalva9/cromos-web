-- =====================================================
-- FIX: admin_list_templates rating_count type mismatch
-- =====================================================
-- Purpose: Fix integer/bigint type mismatch in rating_count (column 8)
-- Error: "Returned type integer does not match expected type bigint in column 8"
-- Root Cause: rating_count is INTEGER in table but BIGINT in function
-- Solution: Change rating_count to INTEGER to match actual column type
-- =====================================================

DROP FUNCTION IF EXISTS admin_list_templates(TEXT, TEXT, INTEGER, INTEGER) CASCADE;

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
    rating_count INTEGER,  -- Changed to INTEGER to match actual column type
    copies_count INTEGER,  -- Also INTEGER to match actual column type
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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
        COALESCE(ct.status, 'active')::TEXT AS status,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.rating_avg,
        ct.rating_count,  -- Return as-is (INTEGER)
        ct.copies_count,  -- Return as-is (INTEGER)
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
COMMENT ON FUNCTION admin_list_templates IS 'Returns paginated templates for admin oversight (rating_count and copies_count as INTEGER)';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check the function signature:
-- SELECT pg_get_function_result(oid) FROM pg_proc WHERE proname = 'admin_list_templates';
-- Expected: rating_count integer, copies_count integer
