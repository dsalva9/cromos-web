-- =====================================================
-- Fix all report functions to use TEXT for target_id
-- =====================================================
-- Issue: All report query functions were returning target_id as BIGINT
-- but the column was changed to TEXT to support both numeric and UUID IDs
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.list_pending_reports(integer, integer);
DROP FUNCTION IF EXISTS public.get_reports(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_user_reports(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_recent_reports(integer);

-- Recreate list_pending_reports with TEXT target_id
CREATE OR REPLACE FUNCTION public.list_pending_reports(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(report_id bigint, reporter_nickname text, entity_type text, entity_id text, reason text, description text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_user_is_admin BOOLEAN;
BEGIN
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
$function$;

-- Recreate get_reports with TEXT target_id
CREATE OR REPLACE FUNCTION public.get_reports(p_status text DEFAULT NULL::text, p_target_type text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(id bigint, reporter_id uuid, reporter_nickname text, target_type text, target_id text, reason text, description text, status text, admin_notes text, admin_id uuid, admin_nickname text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
        r.admin_notes,
        r.admin_id,
        ap.nickname AS admin_nickname,
        r.created_at,
        r.updated_at
    FROM reports r
    JOIN profiles rp ON r.reporter_id = rp.id
    LEFT JOIN profiles ap ON r.admin_id = ap.id
    WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_target_type IS NULL OR r.target_type = p_target_type)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Recreate get_user_reports with TEXT target_id
CREATE OR REPLACE FUNCTION public.get_user_reports(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(id bigint, target_type text, target_id text, reason text, description text, status text, admin_notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.target_type,
        r.target_id,
        r.reason,
        r.description,
        r.status,
        r.admin_notes,
        r.created_at,
        r.updated_at
    FROM reports r
    WHERE r.reporter_id = auth.uid()
    AND (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Recreate get_recent_reports with TEXT target_id and proper type casting
CREATE OR REPLACE FUNCTION public.get_recent_reports(p_limit integer DEFAULT 10)
RETURNS TABLE(id bigint, reporter_id uuid, reporter_nickname text, target_type text, target_id text, reason text, description text, status text, created_at timestamp with time zone, target_title text, target_user_nickname text, target_user_avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    -- Joins for target entity details - cast target_id to appropriate type
    LEFT JOIN trade_listings tl ON r.target_type = 'listing' AND r.target_id::bigint = tl.id
    LEFT JOIN profiles pl ON r.target_type = 'listing' AND tl.user_id = pl.id
    LEFT JOIN collection_templates ct ON r.target_type = 'template' AND r.target_id::bigint = ct.id
    LEFT JOIN profiles pt ON r.target_type = 'template' AND ct.author_id = pt.id
    LEFT JOIN profiles p ON r.target_type = 'user' AND r.target_id::uuid = p.id
    LEFT JOIN user_ratings ur ON r.target_type = 'rating' AND r.target_id::bigint = ur.id
    LEFT JOIN profiles pr ON r.target_type = 'rating' AND ur.rated_id = pr.id
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_pending_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_reports TO authenticated;
