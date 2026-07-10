-- ─────────────────────────────────────────────────────────────
-- Migration: Analytics Hourly Activity
-- Path: supabase/migrations/20260710160005_analytics_hourly_activity.sql
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_stats_hourly_activity(
  p_days INT DEFAULT 1
)
RETURNS TABLE(
  activity_hour INT,
  new_registers BIGINT,
  new_listings  BIGINT
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
  )
  SELECT
    h.hour_val AS activity_hour,
    COALESCE(r.count, 0)::BIGINT AS new_registers,
    COALESCE(l.count, 0)::BIGINT AS new_listings
  FROM hours h
  LEFT JOIN regs r ON h.hour_val = r.hour_val
  LEFT JOIN lsts l ON h.hour_val = l.hour_val
  ORDER BY h.hour_val;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_hourly_activity(INT) IS
  'Returns the count of new registers and new listings grouped by hour of the day (UTC) for the last N days.';

GRANT EXECUTE ON FUNCTION public.admin_stats_hourly_activity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats_hourly_activity(INT) TO service_role;
