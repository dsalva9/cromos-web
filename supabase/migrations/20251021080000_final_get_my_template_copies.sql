-- =====================================================
-- COLLECTION TEMPLATES: Final working get_my_template_copies
-- =====================================================
-- Purpose: Create the final working version of the function
-- =====================================================

-- Drop and recreate the function with the correct implementation
DROP FUNCTION IF EXISTS get_my_template_copies();

CREATE OR REPLACE FUNCTION get_my_template_copies()
RETURNS TABLE (
    copy_id BIGINT,
    template_id BIGINT,
    title TEXT,
    is_active BOOLEAN,
    copied_at TIMESTAMPTZ,
    original_author_nickname TEXT,
    original_author_id UUID,
    completed_slots BIGINT,
    total_slots BIGINT,
    completion_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Return the actual data with progress
    RETURN QUERY
    SELECT 
        utc.id::BIGINT AS copy_id,
        utc.template_id::BIGINT AS template_id,
        utc.title::TEXT AS title,
        utc.is_active::BOOLEAN AS is_active,
        utc.copied_at::TIMESTAMPTZ AS copied_at,
        COALESCE(p.nickname, 'Unknown')::TEXT AS original_author_nickname,
        p.id::UUID AS original_author_id,
        COALESCE(progress_counts.completed_slots, 0)::BIGINT AS completed_slots,
        COALESCE(progress_counts.total_slots, 0)::BIGINT AS total_slots,
        CASE 
            WHEN COALESCE(progress_counts.total_slots, 0) = 0 THEN 0.0
            ELSE ROUND(
                (COALESCE(progress_counts.completed_slots, 0)::DECIMAL / 
                 GREATEST(COALESCE(progress_counts.total_slots, 1), 1)::DECIMAL) * 100, 2
            )
        END::DECIMAL(5,2) AS completion_percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT 
            copy_id,
            COUNT(*) FILTER (WHERE status IN ('owned', 'duplicate')) AS completed_slots,
            COUNT(*) AS total_slots
        FROM user_template_progress
        GROUP BY copy_id
    ) progress_counts ON utc.id = progress_counts.copy_id
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Also create a simpler version that just returns basic info
CREATE OR REPLACE FUNCTION get_my_template_copies_simple()
RETURNS TABLE (
    copy_id BIGINT,
    template_id BIGINT,
    title TEXT,
    is_active BOOLEAN,
    copied_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple version without progress calculations
    RETURN QUERY
    SELECT 
        utc.id::BIGINT AS copy_id,
        utc.template_id::BIGINT AS template_id,
        utc.title::TEXT AS title,
        utc.is_active::BOOLEAN AS is_active,
        utc.copied_at::TIMESTAMPTZ AS copied_at
    FROM user_template_copies utc
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies_simple TO authenticated;

-- Verify functions exist
SELECT 
    proname,
    pronargs,
    'Function exists' as status
FROM pg_proc 
WHERE proname IN ('get_my_template_copies', 'get_my_template_copies_simple');