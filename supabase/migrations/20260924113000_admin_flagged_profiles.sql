-- Migration: Admin flagged profiles support
-- Deployed: 2026-09-24

-- 1. Drop and recreate search_users_admin with flagged filter and new return columns
DROP FUNCTION IF EXISTS public.search_users_admin(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.search_users_admin(
  p_query text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  nickname text,
  avatar_url text,
  is_admin boolean,
  is_suspended boolean,
  is_pending_deletion boolean,
  deletion_scheduled_for timestamptz,
  rating_avg numeric,
  rating_count bigint,
  active_listings_count bigint,
  reports_received_count bigint,
  created_at timestamptz,
  is_patron boolean,
  messages_sent bigint,
  messages_received bigint,
  albums_count bigint,
  country_code text,
  is_flagged boolean,
  flagged_at timestamptz,
  flagged_reason text,
  flagged_source_profile_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
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
        p.created_at,
        p.is_patron,
        (SELECT COUNT(*)::BIGINT FROM trade_chats tc WHERE tc.sender_id = p.id) AS messages_sent,
        (SELECT COUNT(*)::BIGINT FROM trade_chats tc2 WHERE tc2.listing_id IN (SELECT tl2.id FROM trade_listings tl2 WHERE tl2.user_id = p.id) AND tc2.sender_id != p.id) AS messages_received,
        (SELECT COUNT(*)::BIGINT FROM user_collection_copies ucc WHERE ucc.user_id = p.id) AS albums_count,
        COALESCE(p.country_code, '')::TEXT AS country_code,
        COALESCE(p.is_flagged, false) AS is_flagged,
        p.flagged_at,
        p.flagged_reason,
        p.flagged_source_profile_id
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN retention_schedule rs ON rs.entity_type = 'user' AND rs.entity_id = p.id::TEXT AND rs.processed_at IS NULL
    WHERE
        (p_query IS NULL OR p_query = '' OR
         p.nickname ILIKE '%' || p_query || '%' OR
         au.email ILIKE '%' || p_query || '%')
        AND (p_status = 'all' OR
             (p_status = 'active' AND NOT p.is_suspended AND NOT COALESCE(p.is_flagged, false) AND (rs.id IS NULL OR rs.processed_at IS NOT NULL)) OR
             (p_status = 'suspended' AND p.is_suspended AND (rs.id IS NULL OR rs.processed_at IS NOT NULL)) OR
             (p_status = 'pending_deletion' AND rs.id IS NOT NULL AND rs.processed_at IS NULL) OR
             (p_status = 'flagged' AND COALESCE(p.is_flagged, false) = true))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- 2. Admin function to approve a flagged profile
CREATE OR REPLACE FUNCTION public.admin_approve_flagged_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_user_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    UPDATE profiles
    SET is_flagged = false,
        flagged_at = NULL,
        flagged_reason = NULL,
        flagged_source_profile_id = NULL,
        rating_cooldown_until = NULL
    WHERE id = p_user_id;

    INSERT INTO audit_log (action, entity, user_id, admin_id, admin_nickname, occurred_at)
    VALUES ('approve_flagged_profile', 'profiles', p_user_id, auth.uid(),
            (SELECT nickname FROM profiles WHERE id = auth.uid()), now());
END;
$function$;
