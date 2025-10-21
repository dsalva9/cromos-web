-- =====================================================
-- COLLECTION TEMPLATES: Fix get_my_template_copies RPC
-- =====================================================
-- Purpose: Ensure get_my_template_copies is properly available
-- This migration recreates the function to ensure it works correctly
-- =====================================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_my_template_copies();

-- FUNCTION: get_my_template_copies
-- Gets all template copies for the current user with progress statistics
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
    RETURN QUERY
    SELECT 
        utc.id AS copy_id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        p.nickname AS original_author_nickname,
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
    JOIN collection_templates ct ON utc.template_id = ct.id
    JOIN profiles p ON ct.author_id = p.id
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

-- Add comment for documentation
COMMENT ON FUNCTION get_my_template_copies IS 'Gets all template copies for the current user with progress statistics';