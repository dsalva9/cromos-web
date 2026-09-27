-- Migration: Admin User Full Info and Reports inspection
-- Provides detailed user info, reports listing (text and cause), and adds reports_received_count to ratings query

-- 1. Function: admin_get_user_reports
CREATE OR REPLACE FUNCTION public.admin_get_user_reports(p_user_id UUID)
RETURNS TABLE (
  report_id BIGINT,
  reason TEXT,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  reporter_id UUID,
  reporter_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT profiles.is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    r.id AS report_id,
    r.reason,
    r.description,
    r.status,
    r.created_at,
    r.reporter_id,
    COALESCE(p.nickname, 'Unknown')::TEXT AS reporter_nickname
  FROM reports r
  LEFT JOIN profiles p ON p.id = r.reporter_id
  WHERE r.target_type = 'user' AND r.target_id = p_user_id::TEXT
  ORDER BY r.created_at DESC;
END;
$$;

-- 2. Function: admin_get_user_full_info
CREATE OR REPLACE FUNCTION public.admin_get_user_full_info(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_info JSONB;
BEGIN
  SELECT profiles.is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p.id,
    'email', COALESCE(au.email, '')::TEXT,
    'nickname', COALESCE(p.nickname, 'Unknown')::TEXT,
    'avatar_url', p.avatar_url,
    'country_code', COALESCE(p.country_code, '')::TEXT,
    'created_at', p.created_at,
    'is_admin', p.is_admin,
    'is_patron', p.is_patron,
    'is_suspended', p.is_suspended,
    'is_pending_deletion', (rs.id IS NOT NULL AND rs.processed_at IS NULL),
    'deletion_scheduled_for', rs.scheduled_for,
    'is_flagged', COALESCE(p.is_flagged, false),
    'flagged_at', p.flagged_at,
    'flagged_reason', p.flagged_reason,
    'flagged_source_profile_id', p.flagged_source_profile_id,
    'rating_avg', COALESCE(r_agg.avg_rating, p.rating_avg, 0)::NUMERIC(3,2),
    'rating_count', COALESCE(r_agg.cnt_rating, p.rating_count, 0)::BIGINT,
    'ratings_given_count', (SELECT COUNT(*)::BIGINT FROM user_ratings WHERE rater_id = p.id),
    'active_listings_count', (SELECT COUNT(*)::BIGINT FROM trade_listings tl WHERE tl.user_id = p.id AND tl.status = 'active'),
    'messages_sent', (SELECT COUNT(*)::BIGINT FROM trade_chats tc WHERE tc.sender_id = p.id),
    'messages_received', (SELECT COUNT(*)::BIGINT FROM trade_chats tc2 WHERE tc2.listing_id IN (SELECT tl2.id FROM trade_listings tl2 WHERE tl2.user_id = p.id) AND tc2.sender_id != p.id),
    'albums_count', (SELECT COUNT(*)::BIGINT FROM user_template_copies ucc WHERE ucc.user_id = p.id),
    'reports_received_count', (SELECT COUNT(*)::BIGINT FROM reports r WHERE r.target_type = 'user' AND r.target_id = p.id::TEXT),
    'reports', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'description', r.description,
          'status', r.status,
          'created_at', r.created_at,
          'reporter_id', r.reporter_id,
          'reporter_nickname', COALESCE(rep_p.nickname, 'Unknown')
        ) ORDER BY r.created_at DESC
      )
      FROM reports r
      LEFT JOIN profiles rep_p ON rep_p.id = r.reporter_id
      WHERE r.target_type = 'user' AND r.target_id = p.id::TEXT
    ), '[]'::jsonb)
  ) INTO v_info
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN retention_schedule rs ON rs.entity_type = 'user' AND rs.entity_id = p.id::TEXT AND rs.processed_at IS NULL
  LEFT JOIN (
    SELECT 
      ur.rated_id, 
      round(avg(ur.rating)::numeric, 2) AS avg_rating, 
      count(*)::bigint AS cnt_rating
    FROM user_ratings ur
    WHERE ur.rated_id = p_user_id
    GROUP BY ur.rated_id
  ) r_agg ON r_agg.rated_id = p.id
  WHERE p.id = p_user_id;

  RETURN v_info;
END;
$$;

-- 3. Update admin_get_users_by_rating to include reports_received_count
DROP FUNCTION IF EXISTS public.admin_get_users_by_rating(TEXT, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.admin_get_users_by_rating(
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT 'rated',
  p_sort_by TEXT DEFAULT 'rating_desc',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  country_code TEXT,
  rating_avg NUMERIC,
  rating_count BIGINT,
  ratings_given_count BIGINT,
  reports_received_count BIGINT,
  latest_rating_at TIMESTAMPTZ,
  is_patron BOOLEAN,
  is_admin BOOLEAN,
  is_suspended BOOLEAN,
  is_flagged BOOLEAN,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ,
  total_filtered_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT profiles.is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH user_data AS (
    SELECT 
      p.id AS u_id,
      COALESCE(au.email, '')::TEXT AS u_email,
      COALESCE(p.nickname, 'Unknown')::TEXT AS u_nickname,
      p.avatar_url AS u_avatar_url,
      COALESCE(p.country_code, '')::TEXT AS u_country_code,
      COALESCE(r_agg.avg_rating, p.rating_avg, 0)::NUMERIC(3,2) AS u_rating_avg,
      COALESCE(r_agg.cnt_rating, p.rating_count, 0)::BIGINT AS u_rating_count,
      COALESCE(g_agg.cnt_given, 0)::BIGINT AS u_ratings_given_count,
      (SELECT COUNT(*)::BIGINT FROM reports rep WHERE rep.target_type = 'user' AND rep.target_id = p.id::TEXT) AS u_reports_received_count,
      r_agg.max_rating_at AS u_latest_rating_at,
      p.is_patron AS u_is_patron,
      p.is_admin AS u_is_admin,
      p.is_suspended AS u_is_suspended,
      COALESCE(p.is_flagged, false) AS u_is_flagged,
      p.flagged_reason AS u_flagged_reason,
      p.created_at AS u_created_at
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN (
      SELECT 
        ur.rated_id, 
        round(avg(ur.rating)::numeric, 2) AS avg_rating, 
        count(*)::bigint AS cnt_rating, 
        max(ur.created_at) AS max_rating_at
      FROM user_ratings ur
      GROUP BY ur.rated_id
    ) r_agg ON r_agg.rated_id = p.id
    LEFT JOIN (
      SELECT 
        ur.rater_id, 
        count(*)::bigint AS cnt_given
      FROM user_ratings ur
      GROUP BY ur.rater_id
    ) g_agg ON g_agg.rater_id = p.id
  ),
  filtered_users AS (
    SELECT *
    FROM user_data ud
    WHERE
      (p_search IS NULL OR p_search = '' OR
       ud.u_nickname ILIKE '%' || p_search || '%' OR
       ud.u_email ILIKE '%' || p_search || '%')
      AND (
        (p_filter = 'rated' AND ud.u_rating_count > 0) OR
        (p_filter = 'all') OR
        (p_filter = 'well_rated' AND ud.u_rating_avg >= 4.5 AND ud.u_rating_count > 0) OR
        (p_filter = 'neutral' AND ud.u_rating_avg >= 3.0 AND ud.u_rating_avg < 4.5 AND ud.u_rating_count > 0) OR
        (p_filter = 'badly_rated' AND ud.u_rating_avg < 3.0 AND ud.u_rating_count > 0) OR
        (p_filter = 'top_reviewed' AND ud.u_rating_count >= 2) OR
        (p_filter = 'flagged' AND (ud.u_is_flagged = true OR (ud.u_rating_avg < 2.0 AND ud.u_rating_count >= 3))) OR
        (p_filter = 'unrated' AND ud.u_rating_count = 0)
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS total_count FROM filtered_users
  )
  SELECT 
    fu.u_id,
    fu.u_email,
    fu.u_nickname,
    fu.u_avatar_url,
    fu.u_country_code,
    fu.u_rating_avg,
    fu.u_rating_count,
    fu.u_ratings_given_count,
    fu.u_reports_received_count,
    fu.u_latest_rating_at,
    fu.u_is_patron,
    fu.u_is_admin,
    fu.u_is_suspended,
    fu.u_is_flagged,
    fu.u_flagged_reason,
    fu.u_created_at,
    c.total_count
  FROM filtered_users fu
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN p_sort_by = 'rating_desc' THEN fu.u_rating_avg END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'rating_desc' THEN fu.u_rating_count END DESC,
    CASE WHEN p_sort_by = 'rating_asc' THEN fu.u_rating_avg END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'rating_asc' THEN fu.u_rating_count END DESC,
    CASE WHEN p_sort_by = 'count_desc' THEN fu.u_rating_count END DESC,
    CASE WHEN p_sort_by = 'count_desc' THEN fu.u_rating_avg END DESC,
    CASE WHEN p_sort_by = 'count_asc' THEN fu.u_rating_count END ASC,
    CASE WHEN p_sort_by = 'count_asc' THEN fu.u_rating_avg END DESC,
    CASE WHEN p_sort_by = 'recent_desc' THEN fu.u_latest_rating_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'given_desc' THEN fu.u_ratings_given_count END DESC,
    fu.u_created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_reports(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_user_full_info(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_users_by_rating(TEXT, TEXT, TEXT, INT, INT) TO authenticated, service_role;
