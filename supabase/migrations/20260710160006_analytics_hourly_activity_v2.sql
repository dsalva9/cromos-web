-- ─────────────────────────────────────────────────────────────
-- Migration: Analytics Hourly Activity V2 (Expanded)
-- Path: supabase/migrations/20260710160006_analytics_hourly_activity_v2.sql
-- ─────────────────────────────────────────────────────────────

-- Drop first because return type changed (3 columns → 7 columns)
DROP FUNCTION IF EXISTS public.admin_stats_hourly_activity(INT);

CREATE OR REPLACE FUNCTION public.admin_stats_hourly_activity(
  p_days INT DEFAULT 1
)
RETURNS TABLE(
  activity_hour INT,
  new_registers BIGINT,
  new_listings  BIGINT,
  messages_sent BIGINT,
  new_chats     BIGINT,
  exchanges_confirmed BIGINT,
  active_users  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(0, 23) AS hour_val
  ),
  regs AS (
    SELECT
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val,
      COUNT(*) AS count
    FROM public.profiles
    WHERE created_at >= NOW() - (p_days || ' days')::interval
      AND deleted_at IS NULL
    GROUP BY 1
  ),
  lsts AS (
    SELECT
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val,
      COUNT(*) AS count
    FROM public.trade_listings
    WHERE created_at >= NOW() - (p_days || ' days')::interval
      AND deleted_at IS NULL
    GROUP BY 1
  ),
  msgs AS (
    SELECT
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val,
      COUNT(*) AS count
    FROM public.trade_chats
    WHERE created_at >= NOW() - (p_days || ' days')::interval
      AND is_system = false
    GROUP BY 1
  ),
  chats AS (
    SELECT
      EXTRACT(HOUR FROM (first_msg_at AT TIME ZONE 'UTC'))::int AS hour_val,
      COUNT(*) AS count
    FROM (
      SELECT MIN(created_at) AS first_msg_at
      FROM public.trade_chats
      WHERE created_at >= NOW() - (p_days || ' days')::interval
        AND is_system = false
        AND listing_id IS NOT NULL
      GROUP BY listing_id, sender_id
      UNION ALL
      SELECT created_at AS first_msg_at
      FROM public.match_conversations
      WHERE created_at >= NOW() - (p_days || ' days')::interval
    ) threads
    GROUP BY 1
  ),
  exch AS (
    SELECT
      EXTRACT(HOUR FROM (confirmed_at AT TIME ZONE 'UTC'))::int AS hour_val,
      COUNT(*) AS count
    FROM public.trade_confirmations
    WHERE status = 'confirmed'
      AND confirmed_at >= NOW() - (p_days || ' days')::interval
    GROUP BY 1
  ),
  act_users AS (
    SELECT
      hour_val,
      COUNT(DISTINCT user_id) AS count
    FROM (
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, id AS user_id FROM public.profiles WHERE created_at >= NOW() - (p_days || ' days')::interval AND deleted_at IS NULL
      UNION ALL
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, user_id FROM public.trade_listings WHERE created_at >= NOW() - (p_days || ' days')::interval AND deleted_at IS NULL
      UNION ALL
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, sender_id AS user_id FROM public.trade_chats WHERE created_at >= NOW() - (p_days || ' days')::interval AND sender_id IS NOT NULL
      UNION ALL
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, receiver_id AS user_id FROM public.trade_chats WHERE created_at >= NOW() - (p_days || ' days')::interval AND receiver_id IS NOT NULL
      UNION ALL
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, user_a_id AS user_id FROM public.match_conversations WHERE created_at >= NOW() - (p_days || ' days')::interval
      UNION ALL
      SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour_val, user_b_id AS user_id FROM public.match_conversations WHERE created_at >= NOW() - (p_days || ' days')::interval
      UNION ALL
      SELECT EXTRACT(HOUR FROM (confirmed_at AT TIME ZONE 'UTC'))::int AS hour_val, requester_id AS user_id FROM public.trade_confirmations WHERE status = 'confirmed' AND confirmed_at >= NOW() - (p_days || ' days')::interval
      UNION ALL
      SELECT EXTRACT(HOUR FROM (confirmed_at AT TIME ZONE 'UTC'))::int AS hour_val, confirmer_id AS user_id FROM public.trade_confirmations WHERE status = 'confirmed' AND confirmed_at >= NOW() - (p_days || ' days')::interval
    ) combined
    GROUP BY 1
  )
  SELECT
    h.hour_val AS activity_hour,
    COALESCE(r.count, 0)::BIGINT AS new_registers,
    COALESCE(l.count, 0)::BIGINT AS new_listings,
    COALESCE(m.count, 0)::BIGINT AS messages_sent,
    COALESCE(c.count, 0)::BIGINT AS new_chats,
    COALESCE(ex.count, 0)::BIGINT AS exchanges_confirmed,
    COALESCE(au.count, 0)::BIGINT AS active_users
  FROM hours h
  LEFT JOIN regs r ON h.hour_val = r.hour_val
  LEFT JOIN lsts l ON h.hour_val = l.hour_val
  LEFT JOIN msgs m ON h.hour_val = m.hour_val
  LEFT JOIN chats c ON h.hour_val = c.hour_val
  LEFT JOIN exch ex ON h.hour_val = ex.hour_val
  LEFT JOIN act_users au ON h.hour_val = au.hour_val
  ORDER BY h.hour_val;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_hourly_activity(INT) IS
  'Returns the count of new registers, new listings, messages, new chats, exchanges, and unique active users grouped by hour of the day (UTC) for the last N days.';

GRANT EXECUTE ON FUNCTION public.admin_stats_hourly_activity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats_hourly_activity(INT) TO service_role;
