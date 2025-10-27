-- =====================================================
-- REPORTS: Add get_report_details_with_context function
-- =====================================================
-- Purpose: Get detailed report information with context about reported content
-- =====================================================

-- FUNCTION: get_report_details_with_context
-- Gets detailed report information with context about the reported content
DROP FUNCTION IF EXISTS get_report_details_with_context(BIGINT);
CREATE OR REPLACE FUNCTION get_report_details_with_context(
    p_report_id BIGINT
)
RETURNS TABLE (
    report JSONB,
    reported_content JSONB,
    reported_user_history JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_rowcount INTEGER;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Get the report details
    RETURN QUERY
    WITH report_row AS (
        SELECT
            r.*,
            r.target_id::TEXT AS target_id_text
        FROM reports r
        WHERE r.id = p_report_id
    )
    SELECT 
        jsonb_build_object(
            'id', rr.id,
            'entity_type', rr.target_type,
            'reason', rr.reason,
            'description', rr.description,
            'reporter_nickname', rp.nickname,
            'created_at', rr.created_at
        ) AS report,
        -- Build reported content JSON
        CASE 
            WHEN rr.target_type = 'listing' THEN (
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
                WHERE rr.target_id_text IS NOT NULL
                  AND tl.id::TEXT = rr.target_id_text
            )
            WHEN rr.target_type = 'template' THEN (
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
                WHERE rr.target_id_text IS NOT NULL
                  AND ct.id::TEXT = rr.target_id_text
            )
            WHEN rr.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'nickname', u.nickname,
                    'email', au.email,
                    'is_suspended', u.is_suspended,
                    'rating_avg', u.rating_avg
                )
                FROM profiles u
                LEFT JOIN auth.users au ON au.id = u.id
                WHERE rr.target_id_text IS NOT NULL
                  AND u.id::TEXT = rr.target_id_text
            )
            ELSE NULL::jsonb
        END AS reported_content,
        -- Build user history JSON (if reporting a user)
        CASE 
            WHEN rr.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'total_reports_received', (
                        SELECT COUNT(*)
                        FROM reports r2
                        WHERE r2.target_type = 'user'
                          AND r2.target_id::TEXT = rr.target_id_text
                    ),
                    'total_listings', (
                        SELECT COUNT(*)
                        FROM trade_listings tl2
                        WHERE rr.target_id_text IS NOT NULL
                          AND tl2.user_id::TEXT = rr.target_id_text
                    ),
                    'total_templates_created', (
                        SELECT COUNT(*)
                        FROM collection_templates ct2
                        WHERE rr.target_id_text IS NOT NULL
                          AND ct2.author_id::TEXT = rr.target_id_text
                    ),
                    'rating_avg', (
                        SELECT AVG(ur.rating)
                        FROM user_ratings ur
                        WHERE rr.target_id_text IS NOT NULL
                          AND ur.rated_id::TEXT = rr.target_id_text
                    )
                )
            )
            ELSE NULL::jsonb
        END AS reported_user_history
    FROM report_row rr
    JOIN profiles rp ON rr.reporter_id = rp.id;
    
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    
    IF v_rowcount = 0 THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_report_details_with_context TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_report_details_with_context IS 'Gets detailed report information with context about the reported content';
