-- Add optional p_since timestamptz parameter to all admin statistics RPCs.
-- When provided, p_since overrides the p_days-based interval filter,
-- allowing the frontend "Today" filter to query from 3 AM UTC onwards.

-- 1) admin_get_new_users_summary
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
  v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);

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
  ORDER BY p.country_code NULLS LAST, p.created_at DESC;
END;
$$;

-- 2) admin_get_messaging_activity_summary
CREATE OR REPLACE FUNCTION public.admin_get_messaging_activity_summary(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  total_messages bigint,
  unique_senders bigint,
  unique_receivers bigint,
  unique_conversations bigint,
  messages_per_day numeric,
  busiest_hour integer,
  top_senders jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_total BIGINT;
  v_senders BIGINT;
  v_receivers BIGINT;
  v_conversations BIGINT;
  v_per_day NUMERIC;
  v_busiest INT;
  v_top JSONB;
  v_effective_days NUMERIC;
BEGIN
  v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  -- For messages_per_day, compute effective days from v_since
  v_effective_days := GREATEST(EXTRACT(EPOCH FROM (NOW() - v_since)) / 86400.0, 0.01);

  SELECT COUNT(*) INTO v_total
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false;

  SELECT COUNT(DISTINCT tc.sender_id) INTO v_senders
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false AND tc.sender_id IS NOT NULL;

  SELECT COUNT(DISTINCT tc.receiver_id) INTO v_receivers
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false AND tc.receiver_id IS NOT NULL;

  SELECT COUNT(DISTINCT COALESCE(tc.listing_id::TEXT, 'trade_' || tc.trade_id::TEXT)) INTO v_conversations
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false;

  v_per_day := ROUND(v_total::NUMERIC / v_effective_days, 1);

  SELECT EXTRACT(HOUR FROM tc.created_at)::INT INTO v_busiest
  FROM trade_chats tc
  WHERE tc.created_at >= v_since AND tc.is_system = false
  GROUP BY EXTRACT(HOUR FROM tc.created_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_top
  FROM (
    SELECT p.nickname, COUNT(*) AS message_count
    FROM trade_chats tc
    JOIN profiles p ON tc.sender_id = p.id
    WHERE tc.created_at >= v_since AND tc.is_system = false
    GROUP BY p.nickname
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) t;

  RETURN QUERY SELECT v_total, v_senders, v_receivers, v_conversations, v_per_day, v_busiest, v_top;
END;
$$;

-- 3) admin_get_messaging_activity_by_country
CREATE OR REPLACE FUNCTION public.admin_get_messaging_activity_by_country(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  country_code text,
  total_messages bigint,
  unique_senders bigint,
  unique_conversations bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);

  RETURN QUERY
  SELECT
    COALESCE(p.country_code, 'ES') AS country_code,
    COUNT(*)::bigint AS total_messages,
    COUNT(DISTINCT tc.sender_id)::bigint AS unique_senders,
    COUNT(DISTINCT COALESCE(tc.listing_id::TEXT, 'trade_' || tc.trade_id::TEXT))::bigint AS unique_conversations
  FROM trade_chats tc
  JOIN profiles p ON tc.sender_id = p.id
  WHERE tc.created_at >= v_since
    AND tc.is_system = false
  GROUP BY COALESCE(p.country_code, 'ES')
  ORDER BY total_messages DESC;
END;
$$;

-- 4) admin_get_listing_status_stats
CREATE OR REPLACE FUNCTION public.admin_get_listing_status_stats(
  p_days integer DEFAULT 7,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(status text, total bigint)
LANGUAGE plpgsql SECURITY DEFINER
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
    COALESCE(tl.status, 'unknown') AS status,
    COUNT(*)::BIGINT AS total
  FROM trade_listings tl
  WHERE tl.created_at >= v_since
  GROUP BY tl.status
  ORDER BY total DESC;
END;
$$;

-- 5) admin_get_new_listings_by_country
CREATE OR REPLACE FUNCTION public.admin_get_new_listings_by_country(
  p_days integer DEFAULT 1,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(
  country_code text,
  total_listings bigint,
  users jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);

  RETURN QUERY
  SELECT
    COALESCE(tl.country_code, 'ES') AS country_code,
    COUNT(*)::bigint AS total_listings,
    jsonb_agg(
      jsonb_build_object(
        'nickname', p.nickname,
        'listings_count', 1,
        'title', tl.title,
        'listing_type', COALESCE(tl.listing_type, 'exchange'),
        'collection_name', tl.collection_name
      )
      ORDER BY tl.created_at DESC
    ) AS users
  FROM trade_listings tl
  JOIN profiles p ON p.id = tl.user_id
  WHERE tl.created_at >= v_since
    AND tl.deleted_at IS NULL
    AND tl.status != 'suspended'
  GROUP BY COALESCE(tl.country_code, 'ES')
  ORDER BY total_listings DESC;
END;
$$;

-- 6) admin_get_user_distribution_by_postcode
CREATE OR REPLACE FUNCTION public.admin_get_user_distribution_by_postcode(
  p_country_code text DEFAULT 'ES',
  p_days integer DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(province_code text, user_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Determine the cutoff timestamp
  IF p_since IS NOT NULL THEN
    v_since := p_since;
  ELSIF p_days IS NOT NULL THEN
    v_since := NOW() - (p_days || ' days')::INTERVAL;
  ELSE
    v_since := NULL; -- no time filter
  END IF;

  RETURN QUERY
  SELECT
    LEFT(p.postcode, 2) AS province_code,
    COUNT(*)::BIGINT AS user_count
  FROM profiles p
  WHERE p.country_code = p_country_code
    AND p.postcode IS NOT NULL
    AND p.postcode != ''
    AND (v_since IS NULL OR p.created_at >= v_since)
  GROUP BY LEFT(p.postcode, 2)
  ORDER BY user_count DESC;
END;
$$;
