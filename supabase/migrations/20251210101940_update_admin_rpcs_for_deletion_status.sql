-- =====================================================
-- ADMIN PANEL: Update RPCs for better deletion status tracking
-- =====================================================
-- Purpose: Add fields to admin RPCs to properly display deletion status
-- =====================================================

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS search_users_admin(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_list_marketplace_listings(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_list_templates(TEXT, TEXT, INTEGER, INTEGER);

-- FUNCTION 1: Update search_users_admin to include pending deletion status
-- Now returns `is_pending_deletion` based on retention_schedule table
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
    is_pending_deletion BOOLEAN,
    deletion_scheduled_for TIMESTAMPTZ,
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
    -- Check if user is admin
    SELECT profiles.is_admin INTO v_user_is_admin
    FROM profiles
    WHERE profiles.id = auth.uid();

    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
        COALESCE(au.email, '')::TEXT AS email,
        COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
        p.avatar_url,
        p.is_admin,
        p.is_suspended,
        (rs.id IS NOT NULL AND rs.processed_at IS NULL) AS is_pending_deletion,
        rs.scheduled_for AS deletion_scheduled_for,
        COALESCE(p.rating_avg, 0) AS rating_avg,
        COALESCE(p.rating_count, 0)::BIGINT AS rating_count,
        (SELECT COUNT(*)::BIGINT FROM trade_listings tl WHERE tl.user_id = p.id AND tl.status = 'active') AS active_listings_count,
        (SELECT COUNT(*)::BIGINT FROM reports r WHERE r.target_type = 'user' AND r.target_id::TEXT = p.id::TEXT) AS reports_received_count,
        p.created_at
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN retention_schedule rs ON rs.entity_type = 'user' AND rs.entity_id = p.id::TEXT AND rs.processed_at IS NULL
    WHERE
        (p_query IS NULL OR p_query = '' OR
         p.nickname ILIKE '%' || p_query || '%' OR
         au.email ILIKE '%' || p_query || '%')
        AND (p_status = 'all' OR
             (p_status = 'active' AND NOT p.is_suspended AND (rs.id IS NULL OR rs.processed_at IS NOT NULL)) OR
             (p_status = 'suspended' AND p.is_suspended AND (rs.id IS NULL OR rs.processed_at IS NOT NULL)) OR
             (p_status = 'pending_deletion' AND rs.id IS NOT NULL AND rs.processed_at IS NULL))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 2: Update admin_list_marketplace_listings to include deleted_at
-- Returns deleted_at timestamp for soft-deleted listings
CREATE OR REPLACE FUNCTION admin_list_marketplace_listings(
    p_status TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    collection_name TEXT,
    status TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    seller_id UUID,
    seller_nickname TEXT,
    views_count INTEGER,
    transaction_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        tl.id,
        tl.title,
        tl.collection_name,
        COALESCE(tl.status, 'active') AS status,
        tl.deleted_at,
        tl.created_at,
        tl.user_id AS seller_id,
        p.nickname AS seller_nickname,
        COALESCE(tl.views_count, 0)::INTEGER AS views_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM listing_transactions lt
            WHERE lt.listing_id = tl.id
        ) AS transaction_count
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE
        (p_status IS NULL OR COALESCE(tl.status, 'active') = p_status)
        AND (p_query IS NULL OR tl.title ILIKE '%' || p_query || '%')
    ORDER BY tl.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- FUNCTION 3: Update admin_list_templates to include deleted_at
-- Returns deleted_at timestamp and correct status for soft-deleted templates
CREATE OR REPLACE FUNCTION admin_list_templates(
    p_status TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    status TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_nickname TEXT,
    rating_avg DECIMAL,
    rating_count BIGINT,
    copies_count INTEGER,
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        CASE
            WHEN ct.deleted_at IS NOT NULL THEN 'deleted'
            WHEN ct.suspended_at IS NOT NULL THEN 'suspended'
            ELSE 'active'
        END AS status,
        ct.deleted_at,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        COALESCE(ct.rating_avg, 0)::DECIMAL AS rating_avg,
        COALESCE(ct.rating_count, 0)::BIGINT AS rating_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM user_template_copies utc
            WHERE utc.template_id = ct.id
        ) AS copies_count,
        ct.is_public
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE
        (p_status IS NULL OR
         (p_status = 'deleted' AND ct.deleted_at IS NOT NULL) OR
         (p_status = 'suspended' AND ct.suspended_at IS NOT NULL AND ct.deleted_at IS NULL) OR
         (p_status = 'active' AND ct.deleted_at IS NULL AND ct.suspended_at IS NULL))
        AND (p_query IS NULL OR ct.title ILIKE '%' || p_query || '%')
    ORDER BY ct.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION search_users_admin(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION admin_list_marketplace_listings TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_templates TO authenticated;

-- Add comments
COMMENT ON FUNCTION search_users_admin IS 'Search users for admin user management - includes pending deletion status';
COMMENT ON FUNCTION admin_list_marketplace_listings IS 'Returns paginated marketplace listings for admin oversight - includes deleted_at';
COMMENT ON FUNCTION admin_list_templates IS 'Returns paginated templates for admin oversight - includes deleted_at and correct status';
