-- =====================================================
-- COLLECTION TEMPLATES: Debug get_my_template_copies RPC
-- =====================================================
-- Purpose: Create a simplified version for debugging
-- =====================================================

-- First, let's create a simple test version
CREATE OR REPLACE FUNCTION test_get_my_template_copies()
RETURNS TABLE (
    copy_id BIGINT,
    template_id BIGINT,
    title TEXT,
    is_active BOOLEAN,
    copied_at TIMESTAMPTZ,
    original_author_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple query without joins to test basic functionality
    RETURN QUERY
    SELECT 
        utc.id AS copy_id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        'test_author' AS original_author_nickname
    FROM user_template_copies utc
    WHERE utc.user_id = auth.uid()
    LIMIT 5;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_get_my_template_copies TO authenticated;

-- Add comment
COMMENT ON FUNCTION test_get_my_template_copies IS 'Test version of get_my_template_copies for debugging';

-- Now let's recreate the original function with better error handling
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
SET search_path = public
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Return query with explicit joins and better error handling
    RETURN QUERY
    SELECT 
        utc.id AS copy_id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        COALESCE(p.nickname, 'Unknown') AS original_author_nickname,
        p.id AS original_author_id,
        COALESCE(progress_counts.completed_slots, 0) AS completed_slots,
        COALESCE(progress_counts.total_slots, 0) AS total_slots,
        CASE 
            WHEN COALESCE(progress_counts.total_slots, 0) = 0 THEN 0
            ELSE ROUND(
                (COALESCE(progress_counts.completed_slots, 0)::DECIMAL / 
                 COALESCE(progress_counts.total_slots, 1)::DECIMAL) * 100, 2
            )
        END AS completion_percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN LATERAL (
        SELECT 
            copy_id,
            COUNT(*) FILTER (WHERE status IN ('owned', 'duplicate')) AS completed_slots,
            COUNT(*) AS total_slots
        FROM user_template_progress
        WHERE copy_id = utc.id
        GROUP BY copy_id
    ) progress_counts ON true
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
    
    -- Log for debugging
    RAISE NOTICE 'Fetched template copies for user %', auth.uid();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_my_template_copies IS 'Gets all template copies for the current user with progress statistics';