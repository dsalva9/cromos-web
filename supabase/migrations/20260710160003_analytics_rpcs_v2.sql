-- ============================================================
-- Analytics RPCs v2
-- Phase 3: Fixed MAU/WAU/DAU + new Marketplace Health,
--          Activation Funnel, and Engagement RPCs
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Rewrite admin_stats_overview
--    Uses last_activity_at instead of auth.users.last_sign_in_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_overview(
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_registered BIGINT,
  mau              BIGINT,
  wau              BIGINT,
  dau              BIGINT,
  active_listings  BIGINT,
  retention_30d    NUMERIC,
  retention_90d    NUMERIC
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
    -- Total registered (non-deleted)
    COUNT(*) FILTER (
      WHERE p.deleted_at IS NULL
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS total_registered,

    -- MAU: active in last 30 days (meaningful product action)
    COUNT(*) FILTER (
      WHERE p.deleted_at IS NULL
        AND p.last_activity_at >= NOW() - INTERVAL '30 days'
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS mau,

    -- WAU: active in last 7 days
    COUNT(*) FILTER (
      WHERE p.deleted_at IS NULL
        AND p.last_activity_at >= NOW() - INTERVAL '7 days'
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS wau,

    -- DAU: active today (UTC)
    COUNT(*) FILTER (
      WHERE p.deleted_at IS NULL
        AND p.last_activity_at::DATE = CURRENT_DATE
        AND (p_country_code IS NULL OR p.country_code = p_country_code)
    )::BIGINT AS dau,

    -- Active listings (separate subquery for country filter on trade_listings)
    (
      SELECT COUNT(*)::BIGINT FROM public.trade_listings
      WHERE status = 'active'
        AND deleted_at IS NULL
        AND (p_country_code IS NULL OR country_code = p_country_code)
    ) AS active_listings,

    -- Retention 30d (% of users registered 30+ days ago active in last 30d)
    ROUND(100.0 *
      COUNT(*) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '30 days'
          AND p.last_activity_at >= NOW() - INTERVAL '30 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      )::NUMERIC
      / NULLIF(COUNT(*) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '30 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      ), 0)
    , 1) AS retention_30d,

    -- Retention 90d
    ROUND(100.0 *
      COUNT(*) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '90 days'
          AND p.last_activity_at >= NOW() - INTERVAL '90 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      )::NUMERIC
      / NULLIF(COUNT(*) FILTER (
        WHERE p.deleted_at IS NULL
          AND p.created_at <= NOW() - INTERVAL '90 days'
          AND (p_country_code IS NULL OR p.country_code = p_country_code)
      ), 0)
    , 1) AS retention_90d

  FROM public.profiles p;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_overview(TEXT) IS
  'Overview KPIs: total users, MAU/WAU/DAU (based on last_activity_at — real product activity, not auth events), active listings, and overall login-based retention rates. Admin only.';

GRANT EXECUTE ON FUNCTION public.admin_stats_overview(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. New RPC: admin_stats_marketplace_health
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_marketplace_health(
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  active_listings             BIGINT,
  archived_listings           BIGINT,
  historical_listings         BIGINT,
  total_listings_ever         BIGINT,
  reactivated_listings        BIGINT,
  listings_with_conversations BIGINT,
  completed_exchanges         BIGINT,
  listing_exchange_rate       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active   BIGINT;
  v_total    BIGINT;
  v_exchanges BIGINT;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COUNT(*)::BIGINT INTO v_active
  FROM public.trade_listings
  WHERE status = 'active'
    AND deleted_at IS NULL
    AND (p_country_code IS NULL OR country_code = p_country_code);

  SELECT COUNT(*)::BIGINT INTO v_total
  FROM public.trade_listings
  WHERE (p_country_code IS NULL OR country_code = p_country_code);

  SELECT COUNT(*)::BIGINT INTO v_exchanges
  FROM public.trade_confirmations tconf
  LEFT JOIN public.profiles pr ON tconf.requester_id = pr.id
  WHERE tconf.status = 'confirmed'
    AND (p_country_code IS NULL OR pr.country_code = p_country_code);

  RETURN QUERY
  SELECT
    -- Active listings currently visible in marketplace
    v_active,

    -- Archived listings (auto-expired due to inactivity)
    (SELECT COUNT(*)::BIGINT FROM public.trade_listings
     WHERE status = 'archived'
       AND (p_country_code IS NULL OR country_code = p_country_code)),

    -- Historical = all non-active statuses (archived + completed + sold + removed)
    (SELECT COUNT(*)::BIGINT FROM public.trade_listings
     WHERE status != 'active'
       AND (p_country_code IS NULL OR country_code = p_country_code)),

    -- Total ever published (all statuses)
    v_total,

    -- Listings that have been reactivated at least once
    (SELECT COUNT(*)::BIGINT FROM public.trade_listings
     WHERE reactivation_count > 0
       AND (p_country_code IS NULL OR country_code = p_country_code)),

    -- Listings that received at least one real user message
    (SELECT COUNT(DISTINCT tl.id)::BIGINT
     FROM public.trade_listings tl
     WHERE EXISTS (
       SELECT 1 FROM public.trade_chats tc
       WHERE tc.listing_id = tl.id AND tc.is_system = false
     )
     AND (p_country_code IS NULL OR tl.country_code = p_country_code)),

    -- Total confirmed exchanges
    v_exchanges,

    -- Listing → exchange conversion rate (% of total listings)
    CASE WHEN v_total > 0
      THEN ROUND(100.0 * v_exchanges / v_total, 1)
      ELSE 0.0
    END;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_marketplace_health(TEXT) IS
  'Supply-side marketplace metrics: listing lifecycle counts, conversation coverage, and exchange conversion rate. Admin only.';

GRANT EXECUTE ON FUNCTION public.admin_stats_marketplace_health(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. New RPC: admin_stats_activation_funnel
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_activation_funnel(
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_registered     BIGINT,
  users_with_listing   BIGINT,
  users_with_message   BIGINT,
  users_with_match     BIGINT,
  users_with_exchange  BIGINT,
  reg_to_listing_pct   NUMERIC,
  reg_to_message_pct   NUMERIC,
  reg_to_match_pct     NUMERIC,
  reg_to_exchange_pct  NUMERIC,
  reactivated_users    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total    BIGINT;
  v_listing  BIGINT;
  v_message  BIGINT;
  v_match    BIGINT;
  v_exchange BIGINT;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Total registered non-deleted users
  SELECT COUNT(*)::BIGINT INTO v_total
  FROM public.profiles
  WHERE deleted_at IS NULL
    AND (p_country_code IS NULL OR country_code = p_country_code);

  -- Users who have published at least one listing
  SELECT COUNT(DISTINCT tl.user_id)::BIGINT INTO v_listing
  FROM public.trade_listings tl
  JOIN public.profiles p ON p.id = tl.user_id
  WHERE p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code);

  -- Users who have sent at least one message
  SELECT COUNT(DISTINCT tc.sender_id)::BIGINT INTO v_message
  FROM public.trade_chats tc
  JOIN public.profiles p ON p.id = tc.sender_id
  WHERE tc.is_system = false
    AND p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code);

  -- Users who have been in at least one match
  SELECT COUNT(DISTINCT q.uid)::BIGINT INTO v_match
  FROM (
    SELECT user_a_id AS uid FROM public.match_conversations
    UNION
    SELECT user_b_id FROM public.match_conversations
  ) q
  JOIN public.profiles p ON p.id = q.uid
  WHERE p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code);

  -- Users who have completed at least one exchange
  SELECT COUNT(DISTINCT q.uid)::BIGINT INTO v_exchange
  FROM (
    SELECT requester_id AS uid FROM public.trade_confirmations WHERE status = 'confirmed'
    UNION
    SELECT confirmer_id FROM public.trade_confirmations WHERE status = 'confirmed'
  ) q
  JOIN public.profiles p ON p.id = q.uid
  WHERE p.deleted_at IS NULL
    AND (p_country_code IS NULL OR p.country_code = p_country_code);

  RETURN QUERY
  SELECT
    v_total,
    v_listing,
    v_message,
    v_match,
    v_exchange,
    CASE WHEN v_total > 0 THEN ROUND(100.0 * v_listing  / v_total, 1) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND(100.0 * v_message  / v_total, 1) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND(100.0 * v_match    / v_total, 1) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND(100.0 * v_exchange / v_total, 1) ELSE 0 END,
    -- Reactivated users: users who are currently active (last 7d)
    -- AND whose last_activity_at is 30+ days after their previous activity
    -- Approximation: active now AND registered 30+ days ago
    -- A more precise definition needs event store; this is a good proxy
    (SELECT COUNT(*)::BIGINT
     FROM public.profiles
     WHERE deleted_at IS NULL
       AND last_activity_at >= NOW() - INTERVAL '30 days'
       AND created_at <= NOW() - INTERVAL '60 days'
       AND (p_country_code IS NULL OR country_code = p_country_code))::BIGINT;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_activation_funnel(TEXT) IS
  'User activation funnel: registered → listed → messaged → matched → exchanged, with conversion rates. Reactivated users = users active in last 30d who registered 60+ days ago (approximation). Admin only.';

GRANT EXECUTE ON FUNCTION public.admin_stats_activation_funnel(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. New RPC: admin_stats_engagement
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_engagement(
  p_days         INT         DEFAULT 7,
  p_since        TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT        DEFAULT NULL
)
RETURNS TABLE(
  conversations_started  BIGINT,
  active_chats           BIGINT,
  messages_in_period     BIGINT,
  active_users_in_period BIGINT,
  messages_per_active_user NUMERIC,
  exchanges_in_period    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_msgs  BIGINT;
  v_active_u BIGINT;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Determine the start of the period
  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  -- Messages in period
  SELECT COUNT(*)::BIGINT INTO v_msgs
  FROM public.trade_chats tc
  LEFT JOIN public.profiles p ON tc.sender_id = p.id
  WHERE tc.created_at >= v_since
    AND tc.is_system = false
    AND (p_country_code IS NULL OR p.country_code = p_country_code);

  -- Active users in period (based on last_activity_at)
  SELECT COUNT(*)::BIGINT INTO v_active_u
  FROM public.profiles
  WHERE deleted_at IS NULL
    AND last_activity_at >= v_since
    AND (p_country_code IS NULL OR country_code = p_country_code);

  RETURN QUERY
  SELECT
    -- Conversations started in period:
    -- marketplace threads (unique listing+initiator pairs) + match conversations
    (
      (SELECT COUNT(DISTINCT (tc.listing_id, tc.sender_id))::BIGINT
       FROM public.trade_chats tc
       LEFT JOIN public.profiles p ON tc.sender_id = p.id
       WHERE tc.created_at >= v_since
         AND tc.is_system = false
         AND tc.listing_id IS NOT NULL
         AND (p_country_code IS NULL OR p.country_code = p_country_code))
      +
      (SELECT COUNT(*)::BIGINT FROM public.match_conversations mc
       LEFT JOIN public.profiles pa ON mc.user_a_id = pa.id
       WHERE mc.created_at >= v_since
         AND (p_country_code IS NULL OR pa.country_code = p_country_code))
    )::BIGINT AS conversations_started,

    -- Active chats: threads with messages in the last 7 days (fixed window, not period)
    (
      (SELECT COUNT(DISTINCT tc.listing_id)::BIGINT
       FROM public.trade_chats tc
       WHERE tc.listing_id IS NOT NULL
         AND tc.created_at >= NOW() - INTERVAL '7 days'
         AND tc.is_system = false)
      +
      (SELECT COUNT(DISTINCT tc.trade_id)::BIGINT
       FROM public.trade_chats tc
       WHERE tc.trade_id IS NOT NULL
         AND tc.created_at >= NOW() - INTERVAL '7 days'
         AND tc.is_system = false)
    )::BIGINT AS active_chats,

    v_msgs AS messages_in_period,
    v_active_u AS active_users_in_period,

    CASE WHEN v_active_u > 0
      THEN ROUND(v_msgs::NUMERIC / v_active_u, 1)
      ELSE 0.0
    END AS messages_per_active_user,

    -- Exchanges confirmed in period
    (SELECT COUNT(*)::BIGINT
     FROM public.trade_confirmations tconf
     LEFT JOIN public.profiles pr ON tconf.requester_id = pr.id
     WHERE tconf.status = 'confirmed'
       AND tconf.confirmed_at >= v_since
       AND (p_country_code IS NULL OR pr.country_code = p_country_code)
    ) AS exchanges_in_period;
END;
$$;

COMMENT ON FUNCTION public.admin_stats_engagement(INT, TIMESTAMPTZ, TEXT) IS
  'Engagement metrics for a time period: conversations started, active chats, messages, active users, messages per user, exchanges. Active chats always shows the 7-day window regardless of period. Admin only.';

GRANT EXECUTE ON FUNCTION public.admin_stats_engagement(INT, TIMESTAMPTZ, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Update admin_stats_period_totals to include engagement data
--    (Add matches_generated and exchanges_completed already existed,
--    but update to not rely on auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats_period_totals(
  p_days         INT         DEFAULT 7,
  p_since        TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT        DEFAULT NULL
)
RETURNS TABLE(
  new_users           BIGINT,
  new_listings        BIGINT,
  total_messages      BIGINT,
  matches_generated   BIGINT,
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
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_since IS NULL AND p_days >= 99999 THEN
    v_since := '-infinity'::TIMESTAMPTZ;
  ELSE
    v_since := COALESCE(p_since, NOW() - (p_days || ' days')::INTERVAL);
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.profiles
     WHERE created_at >= v_since AND deleted_at IS NULL
       AND (p_country_code IS NULL OR country_code = p_country_code)),

    (SELECT COUNT(*)::BIGINT FROM public.trade_listings tl
     LEFT JOIN public.profiles p ON tl.user_id = p.id
     WHERE tl.created_at >= v_since
       AND (p_country_code IS NULL OR p.country_code = p_country_code)),

    (SELECT COUNT(*)::BIGINT FROM public.trade_chats tc
     LEFT JOIN public.profiles p ON tc.sender_id = p.id
     WHERE tc.created_at >= v_since AND tc.is_system = false
       AND (p_country_code IS NULL OR p.country_code = p_country_code)),

    (SELECT COUNT(*)::BIGINT FROM public.match_conversations mc
     LEFT JOIN public.profiles p ON mc.user_a_id = p.id
     WHERE mc.created_at >= v_since
       AND (p_country_code IS NULL OR p.country_code = p_country_code)),

    (SELECT COUNT(*)::BIGINT FROM public.trade_confirmations tconf
     LEFT JOIN public.profiles p ON tconf.requester_id = p.id
     WHERE tconf.status = 'confirmed' AND tconf.confirmed_at >= v_since
       AND (p_country_code IS NULL OR p.country_code = p_country_code));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats_period_totals(INT, TIMESTAMPTZ, TEXT) TO authenticated;
