-- 1) Create admin_get_new_users_counts
CREATE OR REPLACE FUNCTION public.admin_get_new_users_counts(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  country_code text,
  total_users bigint,
  with_listings bigint,
  with_messages bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- When p_days >= 99999 (the "all" sentinel), show everything
  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::timestamptz;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id AS user_id,
      COALESCE(p.country_code, 'ES') AS country,
      EXISTS (
        SELECT 1 FROM trade_listings tl
        WHERE tl.user_id = p.id
          AND tl.created_at >= v_since
      ) AS has_listings,
      EXISTS (
        SELECT 1 FROM trade_chats tc
        WHERE tc.sender_id = p.id
          AND tc.created_at >= v_since
      ) AS has_messages
    FROM profiles p
    WHERE p.created_at >= v_since
  )
  SELECT
    country AS country_code,
    COUNT(*)::bigint AS total_users,
    COUNT(*) FILTER (WHERE has_listings)::bigint AS with_listings,
    COUNT(*) FILTER (WHERE has_messages)::bigint AS with_messages
  FROM user_stats
  GROUP BY country;
END;
$$;

GRANT ALL ON FUNCTION public.admin_get_new_users_counts(integer, timestamptz) TO anon;
GRANT ALL ON FUNCTION public.admin_get_new_users_counts(integer, timestamptz) TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_new_users_counts(integer, timestamptz) TO service_role;

-- 2) Update admin_get_new_users_summary to add security check
CREATE OR REPLACE FUNCTION public.admin_get_new_users_summary(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  nickname text,
  email text,
  created_at timestamptz,
  listings_count bigint,
  albums_count bigint,
  chat_messages_count bigint,
  country_code text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- When p_days >= 99999 (the "all" sentinel), show everything
  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::timestamptz;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.nickname,
    au.email::TEXT,
    p.created_at,
    COALESCE((
      SELECT COUNT(*) FROM trade_listings tl
      WHERE tl.user_id = p.id
        AND tl.created_at >= v_since
    ), 0) AS listings_count,
    COALESCE((
      SELECT COUNT(*) FROM user_template_copies utc
      WHERE utc.user_id = p.id
    ), 0) AS albums_count,
    COALESCE((
      SELECT COUNT(*) FROM trade_chats tc
      WHERE tc.sender_id = p.id
        AND tc.created_at >= v_since
    ), 0) AS chat_messages_count,
    COALESCE(p.country_code, 'ES') AS country_code
  FROM profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.created_at >= v_since
  ORDER BY p.created_at DESC;
END;
$$;
