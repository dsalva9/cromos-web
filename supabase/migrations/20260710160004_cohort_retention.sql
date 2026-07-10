-- ============================================================
-- Cohort Retention
-- Phase 6: Monthly cohort retention pre-computation table
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Cohort retention table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_cohort_retention (
  cohort_month   DATE        NOT NULL,  -- First day of registration month
  months_after   INT         NOT NULL,  -- 0 = registration month, 1 = next month, etc.
  cohort_size    INT         NOT NULL,  -- Users who registered in that cohort month
  retained_count INT         NOT NULL,  -- Users active in month cohort_month + months_after
  retention_pct  NUMERIC(5,2),          -- retained_count / cohort_size * 100
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_month, months_after)
);

COMMENT ON TABLE public.monthly_cohort_retention IS
  'Monthly cohort retention table. Each row answers: of users who registered in cohort_month, what % were active in that month + months_after? Pre-computed weekly via pg_cron.';

COMMENT ON COLUMN public.monthly_cohort_retention.months_after IS '0 = same month as registration (baseline), 1 = month after, etc.';
COMMENT ON COLUMN public.monthly_cohort_retention.retention_pct IS '% of cohort_size who were active in the target month. month-0 is always 100%.';

ALTER TABLE public.monthly_cohort_retention ENABLE ROW LEVEL SECURITY;
-- No RLS policies — admin-only access via SECURITY DEFINER function

-- ─────────────────────────────────────────────────────────────
-- 2. Compute cohort retention function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_cohort_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cohort_month    DATE;
  v_month_offset    INT;
  v_cohort_size     INT;
  v_retained        INT;
  v_target_month_start TIMESTAMPTZ;
  v_target_month_end   TIMESTAMPTZ;
  v_max_offset      INT;
BEGIN
  -- Loop over all complete registration months
  FOR v_cohort_month IN
    SELECT DISTINCT DATE_TRUNC('month', created_at)::DATE
    FROM public.profiles
    WHERE deleted_at IS NULL
      AND DATE_TRUNC('month', created_at) < DATE_TRUNC('month', CURRENT_DATE)
    ORDER BY 1
  LOOP
    -- Cohort size: users who registered in this month
    SELECT COUNT(*) INTO v_cohort_size
    FROM public.profiles
    WHERE deleted_at IS NULL
      AND DATE_TRUNC('month', created_at)::DATE = v_cohort_month;

    -- Skip empty cohorts
    CONTINUE WHEN v_cohort_size = 0;

    -- Max offset: how many complete months since cohort registered
    v_max_offset := (
      EXTRACT(YEAR FROM AGE(DATE_TRUNC('month', CURRENT_DATE), v_cohort_month)) * 12
      + EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', CURRENT_DATE), v_cohort_month))
    )::INT - 1;

    -- Loop over each month offset
    FOR v_month_offset IN 0..v_max_offset LOOP
      v_target_month_start := (v_cohort_month + (v_month_offset || ' months')::INTERVAL);
      v_target_month_end   := v_target_month_start + INTERVAL '1 month';

      -- Retained: cohort users with any activity in the target month
      SELECT COUNT(*) INTO v_retained
      FROM public.profiles p
      WHERE p.deleted_at IS NULL
        AND DATE_TRUNC('month', p.created_at)::DATE = v_cohort_month
        AND p.last_activity_at >= v_target_month_start
        AND p.last_activity_at < v_target_month_end;

      INSERT INTO public.monthly_cohort_retention
        (cohort_month, months_after, cohort_size, retained_count, retention_pct, computed_at)
      VALUES (
        v_cohort_month,
        v_month_offset,
        v_cohort_size,
        v_retained,
        CASE WHEN v_cohort_size > 0
          THEN ROUND(100.0 * v_retained / v_cohort_size, 1)
          ELSE 0
        END,
        NOW()
      )
      ON CONFLICT (cohort_month, months_after) DO UPDATE SET
        cohort_size    = EXCLUDED.cohort_size,
        retained_count = EXCLUDED.retained_count,
        retention_pct  = EXCLUDED.retention_pct,
        computed_at    = EXCLUDED.computed_at;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.compute_cohort_retention() IS
  'Pre-computes monthly cohort retention for all historical registration cohorts. Idempotent (uses upsert). Run weekly via pg_cron. Requires last_activity_at to be populated on profiles.';

GRANT EXECUTE ON FUNCTION public.compute_cohort_retention() TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Admin read RPC
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_cohort_retention()
RETURNS SETOF public.monthly_cohort_retention
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
  FROM public.monthly_cohort_retention
  ORDER BY cohort_month ASC, months_after ASC;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_cohort_retention() IS 'Returns all pre-computed monthly cohort retention data. Admin only.';
GRANT EXECUTE ON FUNCTION public.admin_stats_cohort_retention() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Schedule weekly recomputation (Monday 05:00 UTC)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('weekly-cohort-retention')
    FROM cron.job WHERE jobname = 'weekly-cohort-retention';

    PERFORM cron.schedule(
      'weekly-cohort-retention',
      '0 5 * * 1',  -- Every Monday at 05:00 UTC
      $$SELECT public.compute_cohort_retention()$$
    );

    RAISE NOTICE 'pg_cron job weekly-cohort-retention scheduled for Mondays at 05:00 UTC.';
  ELSE
    RAISE WARNING 'pg_cron not available — cohort retention job NOT scheduled.';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Run initial computation (populates the table immediately)
-- ─────────────────────────────────────────────────────────────
SELECT public.compute_cohort_retention();
