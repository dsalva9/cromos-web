-- ============================================================
-- Admin statistics revamp RPCs
-- 7 new functions for the statistics dashboard
-- All use SECURITY DEFINER + is_admin_user() guard
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- RPC 1: admin_stats_overview
-- Absolute KPIs (no time filter): total users, MAU/WAU/DAU,
-- active listings, retention 30d/90d
-- Based on auth.users.last_sign_in_at (the only reliable signal)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_overview(
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_registered BIGINT,
  mau BIGINT,
  wau BIGINT,
  dau BIGINT,
  active_listings BIGINT,
  retention_30d NUMERIC,
  retention_90d NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT p.id) FILTER (
      WHERE p.deleted_at IS NULL
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS total_registered,

    COUNT(DISTINCT p.id) FILTER (
      WHERE p.deleted_at IS NULL
        AND au.last_sign_in_at >= NOW() - INTERVAL '30 days'
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS mau,

    COUNT(DISTINCT p.id) FILTER (
      WHERE p.deleted_at IS NULL
        AND au.last_sign_in_at >= NOW() - INTERVAL '7 days'
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS wau,

    COUNT(DISTINCT p.id) FILTER (
      WHERE p.deleted_at IS NULL
        AND au.last_sign_in_at::DATE = CURRENT_DATE
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS dau,

    (
      SELECT COUNT(*) FROM public.trade_listings tl2
      WHERE tl2.status = 'active'
        AND tl2.deleted_at IS NULL
        AND (p_country_code IS NULL OR tl2.country_code = p_country_code)
    )::BIGINT AS active_listings,

    ROUND(
      100.0 * COUNT(DISTINCT p.id) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '30 days'
          AND au.last_sign_in_at >= NOW() - INTERVAL '30 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      )
      / NULLIF(COUNT(DISTINCT p.id) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '30 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      ), 0)
    , 1) AS retention_30d,

    ROUND(
      100.0 * COUNT(DISTINCT p.id) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '90 days'
          AND au.last_sign_in_at >= NOW() - INTERVAL '90 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      )
      / NULLIF(COUNT(DISTINCT p.id) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '90 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      ), 0)
    , 1) AS retention_90d

  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_overview(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 2: admin_stats_new_users_daily
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_new_users_daily(
  p_days INT DEFAULT 30,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(day DATE, user_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    (p.created_at AT TIME ZONE 'UTC')::DATE AS day,
    COUNT(*)::BIGINT AS user_count
  FROM public.profiles p
  WHERE p.created_at >= v_since
    AND p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code)
  GROUP BY (p.created_at AT TIME ZONE 'UTC')::DATE
  ORDER BY day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_new_users_daily(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 3: admin_stats_new_users_weekly
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_new_users_weekly(
  p_days INT DEFAULT 90,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(week_start DATE, user_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    DATE_TRUNC('week', p.created_at AT TIME ZONE 'UTC')::DATE AS week_start,
    COUNT(*)::BIGINT AS user_count
  FROM public.profiles p
  WHERE p.created_at >= v_since
    AND p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code)
  GROUP BY DATE_TRUNC('week', p.created_at AT TIME ZONE 'UTC')
  ORDER BY week_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_new_users_weekly(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 4: admin_stats_daily_listings
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_daily_listings(
  p_days INT DEFAULT 30,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(day DATE, listing_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    (tl.created_at AT TIME ZONE 'UTC')::DATE AS day,
    COUNT(*)::BIGINT AS listing_count
  FROM public.trade_listings tl
  WHERE tl.created_at >= v_since
    AND tl.deleted_at IS NULL
    AND (p_country_code IS NULL OR tl.country_code = p_country_code)
  GROUP BY (tl.created_at AT TIME ZONE 'UTC')::DATE
  ORDER BY day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_daily_listings(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 5: admin_stats_daily_messages
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_daily_messages(
  p_days INT DEFAULT 30,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  day DATE,
  match_messages BIGINT,
  marketplace_messages BIGINT,
  total_messages BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    (tc.created_at AT TIME ZONE 'UTC')::DATE AS day,
    COUNT(*) FILTER (WHERE tc.match_conversation_id IS NOT NULL)::BIGINT AS match_messages,
    COUNT(*) FILTER (WHERE tc.listing_id IS NOT NULL)::BIGINT AS marketplace_messages,
    COUNT(*)::BIGINT AS total_messages
  FROM public.trade_chats tc
  LEFT JOIN public.profiles p ON tc.sender_id = p.id
  WHERE tc.created_at >= v_since
    AND tc.is_system = false
    AND (p_country_code IS NULL OR p.country_code = p_country_code)
  GROUP BY (tc.created_at AT TIME ZONE 'UTC')::DATE
  ORDER BY day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_daily_messages(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 6: admin_stats_period_totals
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_period_totals(
  p_days INT DEFAULT 7,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  new_users BIGINT,
  new_listings BIGINT,
  total_messages BIGINT,
  matches_generated BIGINT,
  exchanges_completed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*) FROM public.profiles p
      WHERE p.created_at >= v_since
        AND p.deleted_at IS NULL
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS new_users,

    (
      SELECT COUNT(*) FROM public.trade_listings tl
      WHERE tl.created_at >= v_since
        AND tl.deleted_at IS NULL
        AND (p_country_code IS NULL OR tl.country_code = p_country_code)
    )::BIGINT AS new_listings,

    (
      SELECT COUNT(*) FROM public.trade_chats tc
      LEFT JOIN public.profiles p ON tc.sender_id = p.id
      WHERE tc.created_at >= v_since
        AND tc.is_system = false
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS total_messages,

    (
      SELECT COUNT(*) FROM public.match_conversations mc
      LEFT JOIN public.profiles pa ON mc.user_a_id = pa.id
      WHERE mc.created_at >= v_since
        AND (p_country_code IS NULL OR pa.country_code = p_country_code)
    )::BIGINT AS matches_generated,

    (
      SELECT COUNT(*) FROM public.trade_confirmations tconf
      LEFT JOIN public.profiles pr ON tconf.requester_id = pr.id
      WHERE tconf.status = 'confirmed'
        AND tconf.confirmed_at >= v_since
        AND (p_country_code IS NULL OR pr.country_code = p_country_code)
    )::BIGINT AS exchanges_completed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_period_totals(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC 7: admin_stats_spain_ccaa
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_spain_ccaa()
RETURNS TABLE(province_code TEXT, user_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    LEFT(p.postcode, 2) AS province_code,
    COUNT(*)::BIGINT AS user_count
  FROM public.profiles p
  WHERE p.country_code = 'ES'
    AND p.postcode IS NOT NULL
    AND p.postcode != ''
    AND p.deleted_at IS NULL
  GROUP BY LEFT(p.postcode, 2)
  ORDER BY user_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_spain_ccaa() TO authenticated;
