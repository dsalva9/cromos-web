-- =============================================================================
-- Optimize Disk IO Budget
-- 
-- 1. Restructure find_mutual_traders to eliminate temp file spills
-- 2. Drop ~30 unused indexes to reduce write IO overhead
-- 3. Set work_mem on heavy functions (Pro tier: 1GB RAM available)
-- 4. Add composite index on trade_listings for get_marketplace_availability
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Optimized find_mutual_traders
--
-- Key change: reverse the join order in mutual_matches.
-- OLD: other_copies → user_template_progress (full copy scan) → my_slots filter
-- NEW: my_slots (small) → user_template_progress via slot_id index → user lookup
--
-- This leverages idx_utp_slot_copy_status (slot_id, copy_id) INCLUDE (status, count)
-- for index-only scans, dramatically reducing the intermediate result set and
-- eliminating the temp file spills that consumed ~6 GB of disk IO.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_mutual_traders(
  p_user_id uuid,
  p_collection_id integer,
  p_rarity text DEFAULT NULL::text,
  p_team text DEFAULT NULL::text,
  p_query text DEFAULT NULL::text,
  p_min_overlap integer DEFAULT 1,
  p_lat double precision DEFAULT NULL::double precision,
  p_lon double precision DEFAULT NULL::double precision,
  p_radius_km double precision DEFAULT NULL::double precision,
  p_sort text DEFAULT NULL::text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  match_user_id uuid,
  nickname text,
  postcode text,
  overlap_from_them_to_me integer,
  overlap_from_me_to_them integer,
  total_mutual_overlap integer,
  distance_km double precision,
  score double precision,
  avatar_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET work_mem = '32MB'
AS $function$
DECLARE
  v_min_overlap integer := GREATEST(COALESCE(p_min_overlap, 1), 1);
  v_sort text := COALESCE(p_sort, 'mixed');
  v_my_copy_id bigint;
BEGIN
  SELECT id INTO v_my_copy_id
  FROM user_template_copies
  WHERE user_id = p_user_id
    AND template_id = p_collection_id
  LIMIT 1;

  IF v_my_copy_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_slots AS (
    -- Single scan: classify my slots as missing or dupe
    SELECT
      utp.slot_id,
      (utp.status = 'missing' OR utp.count = 0) AS is_missing,
      utp.count > 1 AS is_dupe
    FROM user_template_progress utp
    JOIN template_slots ts ON ts.id = utp.slot_id AND ts.template_id = p_collection_id
    LEFT JOIN template_pages tp ON tp.id = ts.page_id
    WHERE utp.copy_id = v_my_copy_id
      AND ((utp.status = 'missing' OR utp.count = 0) OR utp.count > 1)
      AND (p_rarity IS NULL OR ts.slot_variant = p_rarity)
      AND (p_team IS NULL OR tp.title ILIKE '%' || p_team || '%')
      AND (p_query IS NULL OR ts.label ILIKE '%' || p_query || '%')
  ),
  -- OPTIMIZED: Drive from my_slots (small) → progress via slot_id index → user
  -- Instead of scanning ALL other users' copies then joining their progress,
  -- we start from our small set of slot_ids and use the covering index
  -- idx_utp_slot_copy_status (slot_id, copy_id) INCLUDE (status, count)
  -- to find matching progress rows, then look up the user.
  mutual_matches AS (
    SELECT
      utc.user_id AS m_user_id,
      COUNT(DISTINCT CASE
        WHEN tp_them.count > 1 AND ms.is_missing THEN ms.slot_id
      END)::integer AS ov_them_to_me,
      COUNT(DISTINCT CASE
        WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe THEN ms.slot_id
      END)::integer AS ov_me_to_them
    FROM my_slots ms
    JOIN user_template_progress tp_them
      ON tp_them.slot_id = ms.slot_id
      AND tp_them.copy_id <> v_my_copy_id
    JOIN user_template_copies utc
      ON utc.id = tp_them.copy_id
      AND utc.template_id = p_collection_id
      AND utc.user_id <> p_user_id
    GROUP BY utc.user_id
    HAVING
      COUNT(DISTINCT CASE WHEN tp_them.count > 1 AND ms.is_missing THEN ms.slot_id END) >= v_min_overlap
      AND COUNT(DISTINCT CASE WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe THEN ms.slot_id END) >= v_min_overlap
  ),
  base AS (
    SELECT
      mm.m_user_id,
      mm.ov_them_to_me,
      mm.ov_me_to_them,
      (mm.ov_them_to_me + mm.ov_me_to_them) AS total_ov,
      p.nickname AS nick,
      p.postcode AS pcode,
      p.avatar_url AS user_avatar_url,
      CASE
        WHEN p_lat IS NOT NULL AND p_lon IS NOT NULL
             AND pc.lat IS NOT NULL AND pc.lon IS NOT NULL
        THEN haversine_distance(p_lat, p_lon, pc.lat, pc.lon)
        ELSE NULL
      END AS dist_km
    FROM mutual_matches mm
    JOIN profiles p ON p.id = mm.m_user_id
    LEFT JOIN postal_codes pc
      ON pc.country = p.country_code
      AND pc.postcode = p.postcode
  ),
  filtered AS (
    SELECT *,
      MAX(total_ov) OVER () AS max_ov
    FROM base
    WHERE
      p_lat IS NULL OR p_lon IS NULL
      OR p_radius_km IS NULL
      OR (dist_km IS NOT NULL AND dist_km <= p_radius_km)
      OR dist_km IS NULL
  ),
  scored AS (
    SELECT
      f.m_user_id,
      f.nick,
      f.pcode,
      f.ov_them_to_me,
      f.ov_me_to_them,
      f.total_ov,
      f.dist_km,
      f.user_avatar_url,
      CASE
        WHEN f.max_ov IS NULL OR f.max_ov = 0 THEN 0
        ELSE f.total_ov::double precision / f.max_ov::double precision
      END AS norm_ov,
      CASE
        WHEN f.dist_km IS NULL THEN 0
        WHEN p_radius_km IS NOT NULL AND p_radius_km > 0
          THEN GREATEST(0, 1 - (f.dist_km / p_radius_km))
        ELSE 1 / (1 + f.dist_km)
      END AS dist_decay
    FROM filtered f
  )
  SELECT
    s.m_user_id,
    COALESCE(s.nick, 'Usuario')::text,
    s.pcode,
    s.ov_them_to_me,
    s.ov_me_to_them,
    s.total_ov,
    s.dist_km,
    LEAST(
      1.0,
      GREATEST(
        0.0,
        ROUND((0.6 * s.norm_ov + 0.4 * s.dist_decay)::numeric, 4)
      )
    )::double precision,
    s.user_avatar_url
  FROM scored s
  ORDER BY
    CASE WHEN v_sort = 'distance' THEN s.dist_km END ASC NULLS LAST,
    CASE WHEN v_sort = 'distance' THEN (0.6 * s.norm_ov + 0.4 * s.dist_decay) END DESC,
    CASE WHEN v_sort = 'overlap' THEN s.total_ov END DESC,
    CASE WHEN v_sort = 'overlap' THEN s.dist_km END ASC NULLS LAST,
    CASE WHEN v_sort = 'mixed' THEN (0.6 * s.norm_ov + 0.4 * s.dist_decay) END DESC,
    CASE WHEN v_sort = 'mixed' THEN s.dist_km END ASC NULLS LAST,
    s.m_user_id
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$function$;


-- ---------------------------------------------------------------------------
-- 2. Set work_mem on other heavy functions
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.get_marketplace_availability SET work_mem = '16MB';
ALTER FUNCTION public.get_template_details SET work_mem = '16MB';


-- ---------------------------------------------------------------------------
-- 3. Add composite index on trade_listings for get_marketplace_availability
--    The function filters by (status, deleted_at, collection_name, user_id)
--    on every call. This partial index covers the active-only path.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trade_listings_active_collection
  ON public.trade_listings (collection_name, user_id)
  WHERE status = 'active' AND deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- 4. Drop unused indexes (confirmed 0 scans in pg_stat_user_indexes)
--    These waste write IO on every INSERT/UPDATE/DELETE.
-- ---------------------------------------------------------------------------

-- user_template_progress (biggest table, 372K rows, most writes)
DROP INDEX IF EXISTS idx_user_template_progress_data;      -- GIN on data, 0 scans, 1.6 MB
DROP INDEX IF EXISTS idx_user_progress_duplicates;          -- partial btree, 0 scans, 120 KB

-- collection_templates
DROP INDEX IF EXISTS idx_collection_templates_featured;
DROP INDEX IF EXISTS idx_templates_public;
DROP INDEX IF EXISTS idx_templates_rating;
DROP INDEX IF EXISTS idx_templates_not_deleted;
DROP INDEX IF EXISTS idx_collection_templates_country;

-- trade_listings
DROP INDEX IF EXISTS idx_listings_description_trgm;
DROP INDEX IF EXISTS idx_listings_search_spanish;
DROP INDEX IF EXISTS idx_trade_listings_global_number;

-- profiles
DROP INDEX IF EXISTS idx_profiles_active_status;
DROP INDEX IF EXISTS idx_profiles_rating_avg;
DROP INDEX IF EXISTS idx_profiles_onesignal_player_id;

-- notifications
DROP INDEX IF EXISTS idx_notifications_rating_id;
DROP INDEX IF EXISTS idx_notifications_payload_gin;

-- template_slots
DROP INDEX IF EXISTS idx_template_slots_global_number;

-- match_conversations
DROP INDEX IF EXISTS idx_match_conv_last_msg;

-- trade_proposals
DROP INDEX IF EXISTS trade_proposals_collection_id_idx;

-- favourites
DROP INDEX IF EXISTS idx_favourites_template;

-- reports
DROP INDEX IF EXISTS reports_status_idx;
DROP INDEX IF EXISTS reports_status_created_idx;
DROP INDEX IF EXISTS idx_reports_target;

-- leaderboard_cache
DROP INDEX IF EXISTS idx_leaderboard_rank;

-- audit_log
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_audit_log_admin_nickname;
DROP INDEX IF EXISTS idx_audit_log_moderated_entity;

-- pending_emails
DROP INDEX IF EXISTS idx_pending_emails_scheduled;
DROP INDEX IF EXISTS idx_pending_emails_template;

-- email_forwarding_addresses
DROP INDEX IF EXISTS idx_email_forwarding_summary_freq;

-- user_template_copies
DROP INDEX IF EXISTS idx_user_copies_active;
DROP INDEX IF EXISTS idx_user_template_copies_orphaned;

-- email_send_log
DROP INDEX IF EXISTS idx_email_send_log_user_kind_sent;

-- email_bounces
DROP INDEX IF EXISTS idx_email_bounces_suppressed;
