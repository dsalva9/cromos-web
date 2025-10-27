-- =====================================================
-- REPORTS: Add get_report_details_with_context function
-- =====================================================
-- Purpose: Get detailed report information with context about reported content
-- =====================================================

-- FUNCTION: get_report_details_with_context
-- Gets detailed report information with context about the reported content
CREATE OR REPLACE FUNCTION get_report_details_with_context(
    p_report_id BIGINT
)
RETURNS TABLE (
    report_id BIGINT,
    entity_type TEXT,
    reason TEXT,
    description TEXT,
    reporter_nickname TEXT,
    created_at TIMESTAMPTZ,
    -- Reported content details
    reported_content JSONB,
    -- User history (if reporting a user)
    reported_user_history JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_report RECORD;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Get the report details
    SELECT 
        r.id,
        r.target_type,
        r.reason,
        r.description,
        rp.nickname AS reporter_nickname,
        r.created_at,
        -- Build reported content JSON
        CASE 
            WHEN r.target_type = 'listing' THEN (
                SELECT jsonb_build_object(
                    'id', tl.id,
                    'title', tl.title,
                    'description', tl.description,
                    'status', tl.status,
                    'user_nickname', p.nickname,
                    'user_id', tl.user_id
                )
                FROM trade_listings tl
                JOIN profiles p ON tl.user_id = p.id
                WHERE tl.id = r.target_id
            )
            WHEN r.target_type = 'template' THEN (
                SELECT jsonb_build_object(
                    'id', ct.id,
                    'title', ct.title,
                    'description', ct.description,
                    'is_public', ct.is_public,
                    'author_nickname', p.nickname,
                    'author_id', ct.author_id
                )
                FROM collection_templates ct
                JOIN profiles p ON ct.author_id = p.id
                WHERE ct.id = r.target_id
            )
            WHEN r.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'nickname', u.nickname,
                    'email', u.email,
                    'is_suspended', u.is_suspended,
                    'rating_avg', u.rating_avg
                )
                FROM profiles u
                WHERE u.id = r.target_id::UUID
            )
            ELSE NULL::jsonb
        END AS reported_content,
        -- Build user history JSON (if reporting a user)
        CASE 
            WHEN r.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'total_reports_received', (
                        SELECT COUNT(*)
                        FROM reports r2
                        WHERE r2.target_id = r.target_id AND r2.target_type = 'user'
                    ),
                    'total_listings', (
                        SELECT COUNT(*)
                        FROM trade_listings tl2
                        WHERE tl2.user_id = r.target_id::UUID
                    ),
                    'total_templates_created', (
                        SELECT COUNT(*)
                        FROM collection_templates ct2
                        WHERE ct2.author_id = r.target_id::UUID
                    ),
                    'rating_avg', (
                        SELECT AVG(ur.rating)
                        FROM user_ratings ur
                        WHERE ur.rated_id = r.target_id::UUID
                    )
                )
            )
            ELSE NULL::jsonb
        END AS reported_user_history
    FROM reports r
    JOIN profiles rp ON r.reporter_id = rp.id
    WHERE r.id = p_report_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
    
    RETURN QUERY;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_report_details_with_context TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_report_details_with_context IS 'Gets detailed report information with context about the reported content';