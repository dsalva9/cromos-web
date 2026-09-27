-- Migration: Admin User Ratings Management & Analytics
-- Provides statistics, filtered & sorted user rating directory, recent ratings feed, and admin deletion

-- 1. admin_get_ratings_stats
CREATE OR REPLACE FUNCTION public.admin_get_ratings_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_stats JSONB;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT jsonb_build_object(
    'total_ratings', COALESCE(count(*), 0),
    'total_raters', COALESCE(count(DISTINCT rater_id), 0),
    'total_rated_users', COALESCE(count(DISTINCT rated_id), 0),
    'average_rating', COALESCE(round(avg(rating)::numeric, 2), 0),
    'stars_5', COALESCE(count(*) FILTER (WHERE rating = 5), 0),
    'stars_4', COALESCE(count(*) FILTER (WHERE rating = 4), 0),
    'stars_3', COALESCE(count(*) FILTER (WHERE rating = 3), 0),
    'stars_2', COALESCE(count(*) FILTER (WHERE rating = 2), 0),
    'stars_1', COALESCE(count(*) FILTER (WHERE rating = 1), 0),
    'with_comments', COALESCE(count(*) FILTER (WHERE comment IS NOT NULL AND length(trim(comment)) > 0), 0),
    'without_comments', COALESCE(count(*) FILTER (WHERE comment IS NULL OR length(trim(comment)) = 0), 0),
    'well_rated_users_count', (
      SELECT count(*) FROM (
        SELECT rated_id FROM user_ratings GROUP BY rated_id HAVING avg(rating) >= 4.5
      ) sub_well
    ),
    'neutral_rated_users_count', (
      SELECT count(*) FROM (
        SELECT rated_id FROM user_ratings GROUP BY rated_id HAVING avg(rating) >= 3.0 AND avg(rating) < 4.5
      ) sub_neutral
    ),
    'badly_rated_users_count', (
      SELECT count(*) FROM (
        SELECT rated_id FROM user_ratings GROUP BY rated_id HAVING avg(rating) < 3.0
      ) sub_bad
    ),
    'flagged_users_count', (
      SELECT count(*) FROM profiles WHERE is_flagged = true OR (rating_avg < 2.0 AND rating_count >= 3)
    )
  ) INTO v_stats
  FROM user_ratings;

  RETURN v_stats;
END;
$$;

-- 2. admin_get_users_by_rating
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

-- 3. admin_get_recent_ratings
CREATE OR REPLACE FUNCTION public.admin_get_recent_ratings(
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  rating_id BIGINT,
  rating INT,
  comment TEXT,
  context_type TEXT,
  context_id BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rater_id UUID,
  rater_nickname TEXT,
  rater_avatar_url TEXT,
  rater_email TEXT,
  rated_id UUID,
  rated_nickname TEXT,
  rated_avatar_url TEXT,
  rated_email TEXT
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
    ur.id AS rating_id,
    ur.rating,
    ur.comment,
    ur.context_type,
    ur.context_id,
    ur.created_at,
    ur.updated_at,
    ur.rater_id,
    COALESCE(rater_p.nickname, 'Unknown')::TEXT AS rater_nickname,
    rater_p.avatar_url AS rater_avatar_url,
    COALESCE(rater_u.email, '')::TEXT AS rater_email,
    ur.rated_id,
    COALESCE(rated_p.nickname, 'Unknown')::TEXT AS rated_nickname,
    rated_p.avatar_url AS rated_avatar_url,
    COALESCE(rated_u.email, '')::TEXT AS rated_email
  FROM user_ratings ur
  LEFT JOIN profiles rater_p ON rater_p.id = ur.rater_id
  LEFT JOIN auth.users rater_u ON rater_u.id = ur.rater_id
  LEFT JOIN profiles rated_p ON rated_p.id = ur.rated_id
  LEFT JOIN auth.users rated_u ON rated_u.id = ur.rated_id
  WHERE
    (p_filter = 'all') OR
    (p_filter = 'with_comments' AND ur.comment IS NOT NULL AND length(trim(ur.comment)) > 0) OR
    (p_filter = 'bad' AND ur.rating <= 2) OR
    (p_filter = 'good' AND ur.rating >= 4)
  ORDER BY ur.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4. admin_get_user_ratings_detailed
CREATE OR REPLACE FUNCTION public.admin_get_user_ratings_detailed(
  p_target_user_id UUID,
  p_direction TEXT DEFAULT 'received',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  rating_id BIGINT,
  rating INT,
  comment TEXT,
  context_type TEXT,
  context_id BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  other_user_id UUID,
  other_nickname TEXT,
  other_avatar_url TEXT,
  other_email TEXT
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

  IF p_direction = 'received' THEN
    RETURN QUERY
    SELECT 
      ur.id AS rating_id,
      ur.rating,
      ur.comment,
      ur.context_type,
      ur.context_id,
      ur.created_at,
      ur.updated_at,
      ur.rater_id AS other_user_id,
      COALESCE(p.nickname, 'Unknown')::TEXT AS other_nickname,
      p.avatar_url AS other_avatar_url,
      COALESCE(u.email, '')::TEXT AS other_email
    FROM user_ratings ur
    LEFT JOIN profiles p ON p.id = ur.rater_id
    LEFT JOIN auth.users u ON u.id = ur.rater_id
    WHERE ur.rated_id = p_target_user_id
    ORDER BY ur.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT 
      ur.id AS rating_id,
      ur.rating,
      ur.comment,
      ur.context_type,
      ur.context_id,
      ur.created_at,
      ur.updated_at,
      ur.rated_id AS other_user_id,
      COALESCE(p.nickname, 'Unknown')::TEXT AS other_nickname,
      p.avatar_url AS other_avatar_url,
      COALESCE(u.email, '')::TEXT AS other_email
    FROM user_ratings ur
    LEFT JOIN profiles p ON p.id = ur.rated_id
    LEFT JOIN auth.users u ON u.id = ur.rated_id
    WHERE ur.rater_id = p_target_user_id
    ORDER BY ur.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- 5. admin_delete_user_rating
CREATE OR REPLACE FUNCTION public.admin_delete_user_rating(
  p_rating_id BIGINT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_admin_nickname TEXT;
  v_rated_id UUID;
  v_rater_id UUID;
  v_rating_val INT;
BEGIN
  SELECT is_admin, nickname INTO v_is_admin, v_admin_nickname
  FROM profiles WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT rated_id, rater_id, rating INTO v_rated_id, v_rater_id, v_rating_val
  FROM user_ratings WHERE id = p_rating_id;

  IF v_rated_id IS NULL THEN
    RAISE EXCEPTION 'Rating not found';
  END IF;

  DELETE FROM user_ratings WHERE id = p_rating_id;

  -- Recalculate profile ratings
  UPDATE profiles
  SET
    rating_avg = COALESCE(sub.avg_r, 0),
    rating_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT AVG(rating)::NUMERIC(3,2) as avg_r, COUNT(*) as cnt
    FROM user_ratings
    WHERE rated_id = v_rated_id
  ) sub
  WHERE profiles.id = v_rated_id;

  -- Audit log if table exists
  BEGIN
    INSERT INTO audit_log (action, entity, user_id, admin_id, admin_nickname, details, occurred_at)
    VALUES (
      'delete_rating',
      'user_rating',
      v_rated_id,
      auth.uid(),
      v_admin_nickname,
      jsonb_build_object(
        'rating_id', p_rating_id,
        'rater_id', v_rater_id,
        'score', v_rating_val,
        'reason', p_reason
      ),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN TRUE;
END;
$$;

-- Grant permissions to authenticated users (functions verify admin internally)
GRANT EXECUTE ON FUNCTION public.admin_get_ratings_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_users_by_rating(TEXT, TEXT, TEXT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_ratings(INT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_user_ratings_detailed(UUID, TEXT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_rating(BIGINT, TEXT) TO authenticated, service_role;
