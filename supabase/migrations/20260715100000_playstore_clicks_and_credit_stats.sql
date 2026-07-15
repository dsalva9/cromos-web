-- Index to optimize analytics dashboard filtering by event name and date range
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON public.analytics_events(event_name, created_at DESC);

-- RPC 1: admin_stats_google_play_clicks
CREATE OR REPLACE FUNCTION public.admin_stats_google_play_clicks(
  p_days  INT         DEFAULT 7,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  source TEXT,
  click_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(ae.metadata->>'source', 'unknown') as source,
    COUNT(*)::BIGINT as click_count
  FROM public.analytics_events ae
  WHERE ae.event_name = 'google_play_click'
    AND ae.created_at >= v_since
  GROUP BY COALESCE(ae.metadata->>'source', 'unknown')
  ORDER BY click_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_google_play_clicks(INT, TIMESTAMPTZ) TO authenticated;

-- RPC 2: admin_stats_credits_obtained
CREATE OR REPLACE FUNCTION public.admin_stats_credits_obtained(
  p_days  INT         DEFAULT 7,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  purchase_users      BIGINT,
  purchase_credits    BIGINT,
  reward_users        BIGINT,
  reward_credits      BIGINT,
  admin_grant_users   BIGINT,
  admin_grant_credits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    -- 1. Unique paid credit buyers
    COALESCE((
      SELECT COUNT(DISTINCT hct.user_id)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'ls_purchase'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT,
    
    -- 2. Total credits purchased
    COALESCE((
      SELECT SUM(hct.amount)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'ls_purchase'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT,

    -- 3. Unique reward users
    COALESCE((
      SELECT COUNT(DISTINCT hct.user_id)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'rewarded_ad'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT,

    -- 4. Total reward credits
    COALESCE((
      SELECT SUM(hct.amount)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'rewarded_ad'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT,

    -- 5. Unique admin grant users
    COALESCE((
      SELECT COUNT(DISTINCT hct.user_id)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'admin_grant'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT,

    -- 6. Total admin grant credits
    COALESCE((
      SELECT SUM(hct.amount)::BIGINT
      FROM public.highlight_credit_transactions hct
      WHERE hct.credit_source = 'admin_grant'
        AND hct.amount > 0
        AND hct.created_at >= v_since
    ), 0)::BIGINT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_credits_obtained(INT, TIMESTAMPTZ) TO authenticated;

-- RPC 3: admin_get_credit_ranking
CREATE OR REPLACE FUNCTION public.admin_get_credit_ranking(
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  email TEXT,
  purchase_credits BIGINT,
  reward_credits BIGINT,
  total_credits BIGINT
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
  SELECT 
    p.id as user_id,
    COALESCE(p.nickname, 'Unknown') as nickname,
    COALESCE(p.email, 'Unknown') as email,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'ls_purchase' AND hct.amount > 0), 0)::BIGINT as purchase_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'rewarded_ad' AND hct.amount > 0), 0)::BIGINT as reward_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source IN ('ls_purchase', 'rewarded_ad') AND hct.amount > 0), 0)::BIGINT as total_credits
  FROM public.highlight_credit_transactions hct
  JOIN public.profiles p ON hct.user_id = p.id
  WHERE hct.amount > 0 AND hct.credit_source IN ('ls_purchase', 'rewarded_ad')
  GROUP BY p.id, p.nickname, p.email
  ORDER BY total_credits DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_credit_ranking(INT) TO authenticated;
