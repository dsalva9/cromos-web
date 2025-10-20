-- =====================================================
-- ADMIN MODERATION: Create admin dashboard RPCs
-- =====================================================
-- Purpose: Provide dashboard data for admin moderation
-- Note: Creates RPCs for dashboard statistics and metrics
-- =====================================================

-- FUNCTION 1: get_admin_dashboard_stats
-- Gets overall statistics for the admin dashboard
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_listings BIGINT,
    total_templates BIGINT,
    total_reports BIGINT,
    pending_reports BIGINT,
    active_listings BIGINT,
    public_templates BIGINT,
    suspended_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM profiles) AS total_users,
        (SELECT COUNT(*) FROM trade_listings) AS total_listings,
        (SELECT COUNT(*) FROM collection_templates) AS total_templates,
        (SELECT COUNT(*) FROM reports) AS total_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS pending_reports,
        (SELECT COUNT(*) FROM trade_listings WHERE status = 'active') AS active_listings,
        (SELECT COUNT(*) FROM collection_templates WHERE is_public = TRUE) AS public_templates,
        (SELECT COUNT(*) FROM profiles WHERE is_suspended = TRUE) AS suspended_users;
END;
$$;

-- FUNCTION 2: get_recent_reports
-- Gets recent reports for the admin dashboard
CREATE OR REPLACE FUNCTION get_recent_reports(
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    reporter_id UUID,
    reporter_nickname TEXT,
    target_type TEXT,
    target_id BIGINT,
    reason TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    -- Target entity details
    target_title TEXT,
    target_user_nickname TEXT,
    target_user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id,
        r.reporter_id,
        rp.nickname AS reporter_nickname,
        r.target_type,
        r.target_id,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        -- Target entity details
        CASE 
            WHEN r.target_type = 'listing' THEN tl.title
            WHEN r.target_type = 'template' THEN ct.title
            WHEN r.target_type = 'user' THEN p.nickname
            WHEN r.target_type = 'rating' THEN 'Rating #' || r.target_id
            ELSE NULL
        END AS target_title,
        CASE 
            WHEN r.target_type = 'listing' THEN pl.nickname
            WHEN r.target_type = 'template' THEN pt.nickname
            WHEN r.target_type = 'user' THEN p.nickname
            WHEN r.target_type = 'rating' THEN pr.nickname
            ELSE NULL
        END AS target_user_nickname,
        CASE 
            WHEN r.target_type = 'listing' THEN pl.avatar_url
            WHEN r.target_type = 'template' THEN pt.avatar_url
            WHEN r.target_type = 'user' THEN p.avatar_url
            WHEN r.target_type = 'rating' THEN pr.avatar_url
            ELSE NULL
        END AS target_user_avatar_url
    FROM reports r
    JOIN profiles rp ON r.reporter_id = rp.id
    -- Joins for target entity details
    LEFT JOIN trade_listings tl ON r.target_type = 'listing' AND r.target_id = tl.id
    LEFT JOIN profiles pl ON r.target_type = 'listing' AND tl.user_id = pl.id
    LEFT JOIN collection_templates ct ON r.target_type = 'template' AND r.target_id = ct.id
    LEFT JOIN profiles pt ON r.target_type = 'template' AND ct.author_id = pt.id
    LEFT JOIN profiles p ON r.target_type = 'user' AND r.target_id = p.id::BIGINT
    LEFT JOIN user_ratings ur ON r.target_type = 'rating' AND r.target_id = ur.id
    LEFT JOIN profiles pr ON r.target_type = 'rating' AND ur.rated_id = pr.id
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$$;

-- FUNCTION 3: get_moderation_activity
-- Gets recent moderation activity for the admin dashboard
CREATE OR REPLACE FUNCTION get_moderation_activity(
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    admin_id UUID,
    admin_nickname TEXT,
    moderation_action_type TEXT,
    moderated_entity_type TEXT,
    moderated_entity_id BIGINT,
    moderation_reason TEXT,
    created_at TIMESTAMPTZ,
    -- Moderated entity details
    entity_title TEXT,
    entity_user_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.admin_id,
        al.admin_nickname,
        al.moderation_action_type,
        al.moderated_entity_type,
        al.moderated_entity_id,
        al.moderation_reason,
        al.created_at,
        -- Moderated entity details
        CASE 
            WHEN al.moderated_entity_type = 'listing' THEN tl.title
            WHEN al.moderated_entity_type = 'template' THEN ct.title
            WHEN al.moderated_entity_type = 'user' THEN p.nickname
            WHEN al.moderated_entity_type = 'rating' THEN 'Rating #' || al.moderated_entity_id
            ELSE NULL
        END AS entity_title,
        CASE 
            WHEN al.moderated_entity_type = 'listing' THEN pl.nickname
            WHEN al.moderated_entity_type = 'template' THEN pt.nickname
            WHEN al.moderated_entity_type = 'user' THEN p.nickname
            ELSE NULL
        END AS entity_user_nickname
    FROM audit_log al
    -- Joins for entity details
    LEFT JOIN trade_listings tl ON al.moderated_entity_type = 'listing' AND al.moderated_entity_id = tl.id
    LEFT JOIN profiles pl ON al.moderated_entity_type = 'listing' AND tl.user_id = pl.id
    LEFT JOIN collection_templates ct ON al.moderated_entity_type = 'template' AND al.moderated_entity_id = ct.id
    LEFT JOIN profiles pt ON al.moderated_entity_type = 'template' AND ct.author_id = pt.id
    LEFT JOIN profiles p ON al.moderated_entity_type = 'user' AND al.moderated_entity_id = p.id::BIGINT
    WHERE al.moderation_action_type IS NOT NULL
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- FUNCTION 4: get_report_statistics
-- Gets report statistics broken down by type and status
CREATE OR REPLACE FUNCTION get_report_statistics()
RETURNS TABLE (
    target_type TEXT,
    reason TEXT,
    status TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        target_type,
        reason,
        status,
        COUNT(*) AS count
    FROM reports
    GROUP BY target_type, reason, status
    ORDER BY count DESC;
END;
$$;

-- FUNCTION 5: get_admin_performance_metrics
-- Gets performance metrics for admin moderation
CREATE OR REPLACE FUNCTION get_admin_performance_metrics(
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    admin_id UUID,
    admin_nickname TEXT,
    actions_taken BIGINT,
    reports_resolved BIGINT,
    users_suspended BIGINT,
    content_deleted BIGINT,
    avg_resolution_hours DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Calculate start date
    v_start_date := NOW() - (p_days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        admin_id,
        admin_nickname,
        actions_taken,
        reports_resolved,
        users_suspended,
        content_deleted,
        avg_resolution_hours
    FROM (
        SELECT 
            al.admin_id,
            al.admin_nickname,
            COUNT(*) AS actions_taken,
            COUNT(*) FILTER (WHERE al.moderation_action_type = 'update_report_status' AND al.new_values->>'status' IN ('resolved', 'dismissed')) AS reports_resolved,
            COUNT(*) FILTER (WHERE al.moderation_action_type = 'suspend_user' AND al.new_values->>'is_suspended' = 'true') AS users_suspended,
            COUNT(*) FILTER (WHERE al.moderation_action_type IN ('delete_listing', 'delete_template', 'delete_user_rating')) AS content_deleted,
            COALESCE(AVG(EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) / 3600), 0) AS avg_resolution_hours
        FROM audit_log al
        LEFT JOIN reports r ON al.moderated_entity_type = 'report' AND al.moderated_entity_id = r.id
        WHERE al.moderation_action_type IS NOT NULL
        AND al.created_at >= v_start_date
        GROUP BY al.admin_id, al.admin_nickname
    ) metrics
    ORDER BY actions_taken DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_moderation_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_performance_metrics TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_admin_dashboard_stats IS 'Gets overall statistics for the admin dashboard';
COMMENT ON FUNCTION get_recent_reports IS 'Gets recent reports for the admin dashboard';
COMMENT ON FUNCTION get_moderation_activity IS 'Gets recent moderation activity for the admin dashboard';
COMMENT ON FUNCTION get_report_statistics IS 'Gets report statistics broken down by type and status';
COMMENT ON FUNCTION get_admin_performance_metrics IS 'Gets performance metrics for admin moderation';