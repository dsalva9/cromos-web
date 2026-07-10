-- ============================================================
-- Daily Stats Snapshots
-- Phase 2: Snapshot table + capture function + pg_cron job
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Snapshot table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_stats_snapshot (
  snapshot_date         DATE        PRIMARY KEY,
  total_users           INT         NOT NULL DEFAULT 0,
  mau                   INT         NOT NULL DEFAULT 0,
  wau                   INT         NOT NULL DEFAULT 0,
  dau                   INT         NOT NULL DEFAULT 0,
  active_listings       INT         NOT NULL DEFAULT 0,
  archived_listings     INT         NOT NULL DEFAULT 0,
  total_listings_ever   INT         NOT NULL DEFAULT 0,
  total_messages        INT         NOT NULL DEFAULT 0,
  total_matches         INT         NOT NULL DEFAULT 0,
  total_exchanges       INT         NOT NULL DEFAULT 0,
  new_users             INT         NOT NULL DEFAULT 0,
  new_listings          INT         NOT NULL DEFAULT 0,
  new_messages          INT         NOT NULL DEFAULT 0,
  retention_30d         NUMERIC(5,2),
  retention_90d         NUMERIC(5,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.daily_stats_snapshot IS
  'Daily snapshot of key platform metrics. Captured at 04:00 UTC for the previous calendar day. Used for historical trend analysis and investor reporting.';

COMMENT ON COLUMN public.daily_stats_snapshot.mau IS 'Monthly Active Users: distinct users with last_activity_at within the past 30 days at snapshot time.';
COMMENT ON COLUMN public.daily_stats_snapshot.wau IS 'Weekly Active Users: distinct users with last_activity_at within the past 7 days at snapshot time.';
COMMENT ON COLUMN public.daily_stats_snapshot.dau IS 'Daily Active Users: distinct users with last_activity_at on the snapshot_date.';
COMMENT ON COLUMN public.daily_stats_snapshot.retention_30d IS '% of users registered 30+ days ago who were active in the past 30 days.';
COMMENT ON COLUMN public.daily_stats_snapshot.retention_90d IS '% of users registered 90+ days ago who were active in the past 90 days.';

-- Enable RLS but provide no policies — only accessible via SECURITY DEFINER functions
ALTER TABLE public.daily_stats_snapshot ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. Snapshot capture function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.capture_daily_stats_snapshot(
  p_target_date DATE DEFAULT NULL  -- NULL = yesterday
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date         DATE := COALESCE(p_target_date, CURRENT_DATE - 1);
  v_window_start TIMESTAMPTZ := v_date::TIMESTAMPTZ;
  v_window_end   TIMESTAMPTZ := (v_date + 1)::TIMESTAMPTZ;
  v_30d_ago      TIMESTAMPTZ := v_window_end - INTERVAL '30 days';
  v_7d_ago       TIMESTAMPTZ := v_window_end - INTERVAL '7 days';
BEGIN
  INSERT INTO public.daily_stats_snapshot (
    snapshot_date,
    total_users,
    mau,
    wau,
    dau,
    active_listings,
    archived_listings,
    total_listings_ever,
    total_messages,
    total_matches,
    total_exchanges,
    new_users,
    new_listings,
    new_messages,
    retention_30d,
    retention_90d
  )
  SELECT
    v_date,

    -- Total non-deleted users at end of day
    (SELECT COUNT(*) FROM public.profiles
     WHERE deleted_at IS NULL AND created_at < v_window_end)::INT,

    -- MAU: active in last 30 days (uses last_activity_at)
    (SELECT COUNT(*) FROM public.profiles
     WHERE deleted_at IS NULL
       AND last_activity_at >= v_30d_ago
       AND last_activity_at < v_window_end)::INT,

    -- WAU: active in last 7 days
    (SELECT COUNT(*) FROM public.profiles
     WHERE deleted_at IS NULL
       AND last_activity_at >= v_7d_ago
       AND last_activity_at < v_window_end)::INT,

    -- DAU: active on snapshot day
    (SELECT COUNT(*) FROM public.profiles
     WHERE deleted_at IS NULL
       AND last_activity_at >= v_window_start
       AND last_activity_at < v_window_end)::INT,

    -- Active listings at end of day (best approximation from current state)
    (SELECT COUNT(*) FROM public.trade_listings
     WHERE status = 'active' AND deleted_at IS NULL)::INT,

    -- Archived listings at end of day
    (SELECT COUNT(*) FROM public.trade_listings
     WHERE status = 'archived')::INT,

    -- Total listings ever (all statuses)
    (SELECT COUNT(*) FROM public.trade_listings
     WHERE created_at < v_window_end)::INT,

    -- Total messages ever (non-system)
    (SELECT COUNT(*) FROM public.trade_chats
     WHERE is_system = false AND created_at < v_window_end)::INT,

    -- Total matches ever
    (SELECT COUNT(*) FROM public.match_conversations
     WHERE created_at < v_window_end)::INT,

    -- Total confirmed exchanges ever
    (SELECT COUNT(*) FROM public.trade_confirmations
     WHERE status = 'confirmed' AND confirmed_at < v_window_end)::INT,

    -- New users on snapshot day
    (SELECT COUNT(*) FROM public.profiles
     WHERE deleted_at IS NULL
       AND created_at >= v_window_start
       AND created_at < v_window_end)::INT,

    -- New listings on snapshot day
    (SELECT COUNT(*) FROM public.trade_listings
     WHERE created_at >= v_window_start
       AND created_at < v_window_end)::INT,

    -- New messages on snapshot day (non-system)
    (SELECT COUNT(*) FROM public.trade_chats
     WHERE is_system = false
       AND created_at >= v_window_start
       AND created_at < v_window_end)::INT,

    -- Retention 30d (% of users registered 30+ days ago, active in last 30d)
    (SELECT ROUND(100.0 *
       COUNT(*) FILTER (WHERE last_activity_at >= v_30d_ago)::NUMERIC
       / NULLIF(COUNT(*), 0)
     , 1)
     FROM public.profiles
     WHERE deleted_at IS NULL
       AND created_at < v_window_end - INTERVAL '30 days'),

    -- Retention 90d
    (SELECT ROUND(100.0 *
       COUNT(*) FILTER (WHERE last_activity_at >= v_window_end - INTERVAL '90 days')::NUMERIC
       / NULLIF(COUNT(*), 0)
     , 1)
     FROM public.profiles
     WHERE deleted_at IS NULL
       AND created_at < v_window_end - INTERVAL '90 days')

  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_users         = EXCLUDED.total_users,
    mau                 = EXCLUDED.mau,
    wau                 = EXCLUDED.wau,
    dau                 = EXCLUDED.dau,
    active_listings     = EXCLUDED.active_listings,
    archived_listings   = EXCLUDED.archived_listings,
    total_listings_ever = EXCLUDED.total_listings_ever,
    total_messages      = EXCLUDED.total_messages,
    total_matches       = EXCLUDED.total_matches,
    total_exchanges     = EXCLUDED.total_exchanges,
    new_users           = EXCLUDED.new_users,
    new_listings        = EXCLUDED.new_listings,
    new_messages        = EXCLUDED.new_messages,
    retention_30d       = EXCLUDED.retention_30d,
    retention_90d       = EXCLUDED.retention_90d;
END;
$$;

COMMENT ON FUNCTION public.capture_daily_stats_snapshot(DATE) IS
  'Captures a point-in-time snapshot of platform metrics for a given date (default: yesterday). Run via pg_cron at 04:00 UTC. Idempotent — safe to rerun for same date.';

GRANT EXECUTE ON FUNCTION public.capture_daily_stats_snapshot(DATE) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Admin read RPC
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_snapshots(
  p_days INT DEFAULT 90
)
RETURNS SETOF public.daily_stats_snapshot
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.daily_stats_snapshot
  WHERE snapshot_date >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::DATE
  ORDER BY snapshot_date ASC;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_snapshots(INT) IS 'Returns daily stats snapshots for the past N days. Admin-only.';
GRANT EXECUTE ON FUNCTION public.admin_stats_snapshots(INT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Schedule pg_cron job (04:00 UTC — after daily digest at 03:00)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists (idempotent)
    PERFORM cron.unschedule('daily-stats-snapshot')
    FROM cron.job WHERE jobname = 'daily-stats-snapshot';

    PERFORM cron.schedule(
      'daily-stats-snapshot',
      '0 4 * * *',
      $$SELECT public.capture_daily_stats_snapshot(NULL)$$
    );

    RAISE NOTICE 'pg_cron job daily-stats-snapshot scheduled at 04:00 UTC daily.';
  ELSE
    RAISE WARNING 'pg_cron extension not available — snapshot job NOT scheduled. Run capture_daily_stats_snapshot() manually.';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Backfill historical new_users / new_listings / new_messages
--    (Point-in-time metrics like MAU cannot be reconstructed)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.daily_stats_snapshot (
  snapshot_date, new_users, new_listings, new_messages
)
SELECT
  d::DATE,
  COALESCE((
    SELECT COUNT(*) FROM public.profiles
    WHERE deleted_at IS NULL
      AND created_at::DATE = d::DATE
  ), 0)::INT,
  COALESCE((
    SELECT COUNT(*) FROM public.trade_listings
    WHERE created_at::DATE = d::DATE
  ), 0)::INT,
  COALESCE((
    SELECT COUNT(*) FROM public.trade_chats
    WHERE is_system = false AND created_at::DATE = d::DATE
  ), 0)::INT
FROM generate_series(
  (SELECT MIN(created_at)::DATE FROM public.profiles),
  CURRENT_DATE - 1,
  '1 day'::INTERVAL
) AS gs(d)
ON CONFLICT (snapshot_date) DO UPDATE SET
  new_users    = EXCLUDED.new_users,
  new_listings = EXCLUDED.new_listings,
  new_messages = EXCLUDED.new_messages;
