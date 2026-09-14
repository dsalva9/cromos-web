-- Migration: exclude deleted and suspended users from find_mutual_traders
-- Prevents deleted and suspended users from appearing in Match Finder (/intercambios/buscar).

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
SET work_mem TO '16MB'
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
  other_copies AS (
    SELECT utc.id AS their_copy_id, utc.user_id AS their_user_id
    FROM user_template_copies utc
    JOIN profiles p ON p.id = utc.user_id
    WHERE utc.template_id = p_collection_id
      AND utc.user_id <> p_user_id
      AND p.deleted_at IS NULL
      AND COALESCE(p.is_suspended, false) = false
  ),
  mutual_matches AS (
    SELECT
      oc.their_user_id AS m_user_id,
      COUNT(DISTINCT CASE
        WHEN tp_them.count > 1 AND ms.is_missing THEN ms.slot_id
      END)::integer AS ov_them_to_me,
      COUNT(DISTINCT CASE
        WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe THEN ms.slot_id
      END)::integer AS ov_me_to_them
    FROM other_copies oc
    JOIN user_template_progress tp_them ON tp_them.copy_id = oc.their_copy_id
    JOIN my_slots ms ON ms.slot_id = tp_them.slot_id
    WHERE (tp_them.count > 1 AND ms.is_missing)
       OR ((tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe)
    GROUP BY oc.their_user_id
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
    WHERE p.deleted_at IS NULL
      AND COALESCE(p.is_suspended, false) = false
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
