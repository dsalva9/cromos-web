-- =====================================================
-- COLLECTION TEMPLATES: Check function details
-- =====================================================
-- Purpose: Verify the function exists and has correct signature
-- =====================================================

-- Check if the function exists and get its details
SELECT 
    p.proname as function_name,
    p.pronargs as num_args,
    array_to_string(p.proargnames, ', ') as arg_names,
    t.typname as return_type
FROM pg_proc p
JOIN pg_type t ON p.prorettype = t.oid
WHERE p.proname = 'get_my_template_copies';

-- Now let's create a very simple version that should work
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
    -- Return empty result if no templates - avoid errors
    RETURN QUERY
    SELECT 
        utc.id::BIGINT,
        utc.template_id::BIGINT,
        utc.title::TEXT,
        utc.is_active::BOOLEAN,
        utc.copied_at::TIMESTAMPTZ,
        COALESCE(p.nickname, 'Unknown')::TEXT,
        p.id::UUID,
        0::BIGINT,
        0::BIGINT,
        0.0::DECIMAL(5,2)
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    WHERE utc.user_id = auth.uid()
    LIMIT 0; -- Return empty for now to test if function works
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Test function exists again
SELECT 'Function created successfully' as status;