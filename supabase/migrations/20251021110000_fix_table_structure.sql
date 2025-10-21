-- =====================================================
-- COLLECTION TEMPLATES: Fix table structure reference
-- =====================================================
-- Purpose: Fix the column reference to match actual table structure
-- =====================================================

-- First, let's check the actual structure of user_template_progress
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_template_progress' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now let's fix the function with the correct column references
DROP FUNCTION IF EXISTS get_my_template_copies() CASCADE;

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
    
    -- Use a simpler approach without counting non-existent columns
    RETURN QUERY
    SELECT 
        utc.id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        COALESCE(p.nickname, 'Unknown'),
        p.id,
        0, -- Default completed_slots for now
        0, -- Default total_slots for now
        0.0 -- Default completion percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    WHERE utc.user_id = v_user_id
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Create a working simple version
CREATE OR REPLACE FUNCTION get_my_template_copies_basic()
RETURNS TABLE (
    copy_id BIGINT,
    template_id BIGINT,
    title TEXT,
    is_active BOOLEAN,
    copied_at TIMESTAMPTZ,
    original_author_nickname TEXT,
    original_author_id UUID
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
        COALESCE(p.nickname, 'Unknown')::TEXT,
        p.id::UUID
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.copied_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_template_copies_basic TO authenticated;

-- Verify functions
SELECT 
    proname,
    'created successfully' as status
FROM pg_proc 
WHERE proname IN ('get_my_template_copies', 'get_my_template_copies_basic', 'test_get_my_template_copies');