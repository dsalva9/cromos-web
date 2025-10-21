-- =====================================================
-- COLLECTION TEMPLATES: Comprehensive fix for get_my_template_copies
-- =====================================================
-- Purpose: Completely rewrite the function to avoid all ambiguity issues
-- =====================================================

-- First, let's check what functions exist
SELECT proname, pronargs FROM pg_proc WHERE proname LIKE '%template%';

-- Drop all versions to start fresh
DROP FUNCTION IF EXISTS get_my_template_copies() CASCADE;
DROP FUNCTION IF EXISTS get_my_template_copies_simple() CASCADE;
DROP FUNCTION IF EXISTS test_get_my_template_copies() CASCADE;

-- Create a completely new version with different approach
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
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Validate user
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Use a CTE approach to avoid ambiguity
    RETURN QUERY
    WITH template_progress AS (
        SELECT 
            utc.id AS copy_id_val,
            COUNT(utp.id) FILTER (WHERE utp.status IN ('owned', 'duplicate')) AS completed_val,
            COUNT(utp.id) AS total_val
        FROM user_template_copies utc
        LEFT JOIN user_template_progress utp ON utc.id = utp.copy_id
        WHERE utc.user_id = v_user_id
        GROUP BY utc.id
    )
    SELECT 
        utc.id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        COALESCE(p.nickname, 'Unknown'),
        p.id,
        COALESCE(tp.completed_val, 0),
        COALESCE(tp.total_val, 0),
        CASE 
            WHEN COALESCE(tp.total_val, 0) = 0 THEN 0.0
            ELSE ROUND(
                (COALESCE(tp.completed_val, 0)::DECIMAL / 
                 GREATEST(COALESCE(tp.total_val, 1), 1)::DECIMAL) * 100, 2
            )
        END
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN template_progress tp ON utc.id = tp.copy_id_val
    WHERE utc.user_id = v_user_id
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Create a simple version for testing
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
    RETURN QUERY
    SELECT 
        utc.id::BIGINT,
        utc.template_id::BIGINT,
        utc.title::TEXT,
        utc.is_active::BOOLEAN,
        utc.copied_at::TIMESTAMPTZ,
        COALESCE(p.nickname, 'Test')::TEXT
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.copied_at DESC
    LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION test_get_my_template_copies TO authenticated;

-- Verify functions
SELECT 
    proname,
    'created successfully' as status
FROM pg_proc 
WHERE proname IN ('get_my_template_copies', 'test_get_my_template_copies');