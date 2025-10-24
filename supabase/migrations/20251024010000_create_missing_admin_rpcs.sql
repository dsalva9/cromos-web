-- =====================================================
-- ADMIN MODERATION: Create missing admin RPCs
-- =====================================================
-- Purpose: Add missing RPC functions for admin UI
-- =====================================================

-- FUNCTION: list_pending_reports
-- Lists all pending reports for admin review
CREATE OR REPLACE FUNCTION list_pending_reports()
RETURNS TABLE (
    id BIGINT,
    reporter_id UUID,
    reporter_nickname TEXT,
    target_type TEXT,
    target_id TEXT,
    reason TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
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
        p.nickname AS reporter_nickname,
        r.target_type,
        r.target_id,
        r.reason,
        r.description,
        r.status,
        r.created_at
    FROM reports r
    JOIN profiles p ON r.reporter_id = p.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC;
END;
$$;

-- FUNCTION: search_users_admin
-- Search users for admin user management
CREATE OR REPLACE FUNCTION search_users_admin(
    p_search TEXT DEFAULT '',
    p_status TEXT DEFAULT 'all'
)
RETURNS TABLE (
    id UUID,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN,
    is_suspended BOOLEAN,
    postcode TEXT,
    created_at TIMESTAMPTZ,
    reports_count BIGINT,
    listings_count BIGINT,
    rating_avg NUMERIC,
    rating_count BIGINT
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
        p.id,
        p.nickname,
        p.email,
        p.avatar_url,
        p.is_admin,
        p.is_suspended,
        p.postcode,
        p.created_at,
        (SELECT COUNT(*) FROM reports WHERE target_type = 'user' AND target_id = p.id::TEXT) AS reports_count,
        (SELECT COUNT(*) FROM trade_listings WHERE user_id = p.id) AS listings_count,
        COALESCE(p.rating_avg, 0) AS rating_avg,
        COALESCE(p.rating_count, 0) AS rating_count
    FROM profiles p
    WHERE
        (p_search = '' OR
         p.nickname ILIKE '%' || p_search || '%' OR
         p.email ILIKE '%' || p_search || '%')
        AND (p_status = 'all' OR
             (p_status = 'active' AND NOT p.is_suspended) OR
             (p_status = 'suspended' AND p.is_suspended))
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_pending_reports TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_admin TO authenticated;

-- Add comments
COMMENT ON FUNCTION list_pending_reports IS 'Lists all pending reports for admin review';
COMMENT ON FUNCTION search_users_admin IS 'Search users for admin user management';
