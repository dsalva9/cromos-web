-- =====================================================
-- ADMIN MODERATION: Create missing admin RPCs
-- =====================================================
-- Purpose: Add missing RPC functions for admin UI
-- =====================================================

-- FUNCTION: list_pending_reports
-- Lists all pending reports for admin review
CREATE OR REPLACE FUNCTION list_pending_reports(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    report_id BIGINT,
    reporter_nickname TEXT,
    entity_type TEXT,
    entity_id BIGINT,
    reason TEXT,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin (use qualified column name to avoid ambiguity)
    SELECT profiles.is_admin INTO v_user_is_admin
    FROM profiles
    WHERE profiles.id = auth.uid();

    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        r.id AS report_id,
        p.nickname AS reporter_nickname,
        r.target_type AS entity_type,
        r.target_id AS entity_id,
        r.reason,
        r.description,
        r.created_at
    FROM reports r
    JOIN profiles p ON r.reporter_id = p.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION: search_users_admin
-- Search users for admin user management
CREATE OR REPLACE FUNCTION search_users_admin(
    p_query TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    nickname TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN,
    is_suspended BOOLEAN,
    rating_avg NUMERIC,
    rating_count BIGINT,
    active_listings_count BIGINT,
    reports_received_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin (use qualified column name to avoid ambiguity)
    SELECT profiles.is_admin INTO v_user_is_admin
    FROM profiles
    WHERE profiles.id = auth.uid();

    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
        COALESCE(au.email, '')::TEXT AS email,  -- Get email from auth.users (cast to TEXT)
        COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
        p.avatar_url,
        p.is_admin,
        p.is_suspended,
        COALESCE(p.rating_avg, 0) AS rating_avg,
        COALESCE(p.rating_count, 0)::BIGINT AS rating_count,
        (SELECT COUNT(*)::BIGINT FROM trade_listings tl WHERE tl.user_id = p.id AND tl.status = 'active') AS active_listings_count,
        (SELECT COUNT(*)::BIGINT FROM reports r WHERE r.target_type = 'user' AND r.target_id::TEXT = p.id::TEXT) AS reports_received_count,
        p.created_at
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id  -- Join with auth.users to get email
    WHERE
        (p_query IS NULL OR p_query = '' OR
         p.nickname ILIKE '%' || p_query || '%' OR
         au.email ILIKE '%' || p_query || '%')
        AND (p_status = 'all' OR
             (p_status = 'active' AND NOT p.is_suspended) OR
             (p_status = 'suspended' AND p.is_suspended))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_pending_reports(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION list_pending_reports(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION list_pending_reports(INTEGER, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Add comments
COMMENT ON FUNCTION list_pending_reports IS 'Lists all pending reports for admin review';
COMMENT ON FUNCTION search_users_admin IS 'Search users for admin user management';
