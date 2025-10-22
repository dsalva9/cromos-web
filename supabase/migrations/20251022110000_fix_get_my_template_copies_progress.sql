-- =====================================================
-- COLLECTION TEMPLATES: Fix get_my_template_copies progress calculation
-- =====================================================
-- Purpose: Fix the RPC to correctly calculate completed_slots and total_slots
-- =====================================================

-- Drop and recreate the function with correct progress calculation
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
    
    -- Return with explicit casting to match RETURN TABLE types
    RETURN QUERY
    SELECT 
        utc.id::BIGINT,
        utc.template_id::BIGINT,
        utc.title::TEXT,
        utc.is_active::BOOLEAN,
        utc.copied_at::TIMESTAMPTZ,
        COALESCE(p.nickname, 'Unknown')::TEXT,
        p.id::UUID,
        -- Calculate completed slots (owned + duplicates)
        COALESCE(
            (
                SELECT COUNT(*) 
                FROM user_template_progress utp 
                WHERE utp.copy_id = utc.id 
                AND utp.status IN ('owned', 'duplicate')
            ), 
            0
        )::BIGINT AS completed_slots,
        -- Calculate total slots from the template
        COALESCE(
            (
                SELECT COUNT(*) 
                FROM template_slots ts 
                JOIN template_pages tp ON ts.page_id = tp.id 
                WHERE tp.template_id = utc.template_id
            ), 
            0
        )::BIGINT AS total_slots,
        -- Calculate completion percentage
        CASE 
            WHEN COALESCE(
                (
                    SELECT COUNT(*) 
                    FROM template_slots ts 
                    JOIN template_pages tp ON ts.page_id = tp.id 
                    WHERE tp.template_id = utc.template_id
                ), 
                0
            ) = 0 THEN 0.0
            ELSE ROUND(
                (
                    COALESCE(
                        (
                            SELECT COUNT(*) 
                            FROM user_template_progress utp 
                            WHERE utp.copy_id = utc.id 
                            AND utp.status IN ('owned', 'duplicate')
                        ), 
                        0
                    )::DECIMAL / 
                    GREATEST(
                        COALESCE(
                            (
                                SELECT COUNT(*) 
                                FROM template_slots ts 
                                JOIN template_pages tp ON ts.page_id = tp.id 
                                WHERE tp.template_id = utc.template_id
                            ), 
                            1
                        ), 
                        1
                    )::DECIMAL
                ) * 100, 2
            )
        END::DECIMAL(5,2) AS completion_percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    WHERE utc.user_id = v_user_id
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Verify function
SELECT 
    proname,
    'created successfully' as status
FROM pg_proc 
WHERE proname = 'get_my_template_copies';