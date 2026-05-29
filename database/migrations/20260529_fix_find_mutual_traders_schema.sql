-- Migration: Fix find_mutual_traders to use current schema
-- The function body was referencing non-existent tables (user_stickers, stickers, collection_teams)
-- from an older data model. Updated to use:
--   template_slots       (replaces stickers)
--   user_template_progress (replaces user_stickers)
--   user_template_copies  (for collection ownership)
--   template_pages        (for page/team filtering)
--
-- Also fixes: users with NULL distance (no postcode lat/lon) were being
-- excluded when radius filtering was active. Now they're always included.

CREATE OR REPLACE FUNCTION public.find_mutual_traders(
  p_user_id uuid,
  p_collection_id integer,
  p_rarity text DEFAULT NULL,
  p_team text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_min_overlap integer DEFAULT 1,
  p_lat double precision DEFAULT NULL,
  p_lon double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT NULL,
  p_sort text DEFAULT 'mixed',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  match_user_id uuid,
  nickname text,
  postcode text,
  overlap_from_them_to_me bigint,
  overlap_from_me_to_them bigint,
  total_mutual_overlap bigint,
  distance_km double precision,
  score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_overlap integer := GREATEST(COALESCE(p_min_overlap, 1), 1);
  v_sort text := COALESCE(p_sort, 'mixed');
  v_my_copy_id bigint;
BEGIN
  -- Find the user's copy of this collection
  SELECT id INTO v_my_copy_id
  FROM user_template_copies
  WHERE user_id = p_user_id
    AND template_id = p_collection_id
  LIMIT 1;

  -- If user doesn't have this collection, return empty
  IF v_my_copy_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_missing AS (
    -- Slots I'm missing (status = 'missing' or count = 0)
    SELECT ts.id AS slot_id
    FROM template_slots ts
    JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = v_my_copy_id
    LEFT JOIN template_pages tp ON tp.id = ts.page_id
    WHERE ts.template_id = p_collection_id
      AND (utp.status = 'missing' OR utp.count = 0)
      AND (p_rarity IS NULL OR ts.slot_variant = p_rarity)
      AND (p_team IS NULL OR tp.title ILIKE '%' || p_team || '%')
      AND (p_query IS NULL OR ts.label ILIKE '%' || p_query || '%')
  ),
  my_dupes AS (
    -- Slots I have as duplicates (count > 1)
    SELECT ts.id AS slot_id
    FROM template_slots ts
    JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = v_my_copy_id
    LEFT JOIN template_pages tp ON tp.id = ts.page_id
    WHERE ts.template_id = p_collection_id
      AND utp.count > 1
      AND (p_rarity IS NULL OR ts.slot_variant = p_rarity)
      AND (p_team IS NULL OR tp.title ILIKE '%' || p_team || '%')
      AND (p_query IS NULL OR ts.label ILIKE '%' || p_query || '%')
  ),
  other_copies AS (
    -- Find other users who have this collection
    SELECT utc.id AS their_copy_id, utc.user_id AS their_user_id
    FROM user_template_copies utc
    WHERE utc.template_id = p_collection_id
      AND utc.user_id <> p_user_id
  ),
  mutual_matches AS (
    SELECT
      oc.their_user_id AS m_user_id,
      COUNT(DISTINCT CASE
        WHEN tp_them.count > 1 AND mm.slot_id IS NOT NULL
        THEN mm.slot_id
      END) AS ov_them_to_me,
      COUNT(DISTINCT CASE
        WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND md.slot_id IS NOT NULL
        THEN md.slot_id
      END) AS ov_me_to_them
    FROM other_copies oc
    LEFT JOIN user_template_progress tp_them
      ON tp_them.copy_id = oc.their_copy_id
    LEFT JOIN my_missing mm ON mm.slot_id = tp_them.slot_id
    LEFT JOIN my_dupes md ON md.slot_id = tp_them.slot_id
    GROUP BY oc.their_user_id
    HAVING
      COUNT(DISTINCT CASE WHEN tp_them.count > 1 AND mm.slot_id IS NOT NULL THEN mm.slot_id END) >= v_min_overlap
      AND COUNT(DISTINCT CASE WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND md.slot_id IS NOT NULL THEN md.slot_id END) >= v_min_overlap
  ),
  base AS (
    SELECT
      mm.m_user_id,
      mm.ov_them_to_me,
      mm.ov_me_to_them,
      (mm.ov_them_to_me + mm.ov_me_to_them) AS total_ov,
      p.nickname AS nick,
      p.postcode AS pcode,
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
      -- Always include users when no geo or no radius set
      p_lat IS NULL OR p_lon IS NULL
      OR p_radius_km IS NULL
      -- Include users within radius
      OR (dist_km IS NOT NULL AND dist_km <= p_radius_km)
      -- Also include users with unknown distance (no postcode/lat/lon)
      -- so they aren't silently excluded from results
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
    )::double precision
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
$$;

COMMENT ON FUNCTION find_mutual_traders IS 'Returns mutual trading partners with optional location-based scoring. Uses current schema (template_slots + user_template_progress).';

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.find_mutual_traders(uuid, integer, text, text, text, integer, double precision, double precision, double precision, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_mutual_traders(uuid, integer, text, text, text, integer, double precision, double precision, double precision, text, integer, integer) TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
