-- =====================================================
-- COLLECTION TEMPLATES: Fix ambiguous copy_id reference
-- =====================================================
-- Purpose: Fix the ambiguous column reference error
-- =====================================================

-- Drop and recreate with aliased column names
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
    
    -- Return the actual data with progress - using explicit aliases to avoid ambiguity
    RETURN QUERY
    SELECT 
        utc.id AS copy_id,
        utc.template_id AS template_id,
        utc.title AS title,
        utc.is_active AS is_active,
        utc.copied_at AS copied_at,
        COALESCE(p.nickname, 'Unknown') AS original_author_nickname,
        p.id AS original_author_id,
        COALESCE(progress.completed_slots, 0) AS completed_slots,
        COALESCE(progress.total_slots, 0) AS total_slots,
        CASE 
            WHEN COALESCE(progress.total_slots, 0) = 0 THEN 0.0
            ELSE ROUND(
                (COALESCE(progress.completed_slots, 0)::DECIMAL / 
                 GREATEST(COALESCE(progress.total_slots, 1), 1)::DECIMAL) * 100, 2
            )
        END AS completion_percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT 
            copy_id AS pc_copy_id,  -- Alias to avoid ambiguity
            COUNT(*) FILTER (WHERE status IN ('owned', 'duplicate')) AS completed_slots,
            COUNT(*) AS total_slots
        FROM user_template_progress
        GROUP BY copy_id
    ) progress ON utc.id = progress.pc_copy_id  -- Use aliased column
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Test function
SELECT 'get_my_template_copies function created with fixed ambiguity' as status;