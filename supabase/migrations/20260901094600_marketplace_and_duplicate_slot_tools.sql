-- Migration: 20260901094600_marketplace_and_duplicate_slot_tools.sql
-- Description: 
-- 1. Extend get_marketplace_availability to return has_users_with_dupe
-- 2. Create find_users_with_duplicate_slot RPC
-- 3. Add p_slot_id filter to list_trade_listings_with_collection_filter

-- 1. get_marketplace_availability
CREATE OR REPLACE FUNCTION public.get_marketplace_availability(p_copy_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET work_mem TO '16MB'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF p_copy_id IS NULL THEN
    WITH user_copies AS (
      SELECT utc.id AS copy_id,
             COALESCE(utc.template_id, utc.original_template_id) AS tmpl_id,
             COALESCE(ct.title, utc.title) AS collection_name
      FROM user_template_copies utc
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      WHERE utc.user_id = v_user_id
    ),
    missing_slots AS (
      SELECT uc.copy_id, uc.collection_name, ts.id AS slot_id, ts.slot_number, ts.slot_variant, tp.title AS page_title, uc.tmpl_id
      FROM user_copies uc
      JOIN template_slots ts ON ts.template_id = uc.tmpl_id
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = uc.copy_id
      WHERE utp.slot_id IS NULL OR utp.status = 'missing'
    ),
    active_listings AS (
      SELECT tl.id, tl.collection_name, tl.sticker_number, tl.page_title, tl.is_group, tl.user_id
      FROM trade_listings tl
      WHERE tl.status = 'active'
        AND tl.deleted_at IS NULL
        AND tl.user_id != v_user_id
        AND tl.collection_name IN (SELECT collection_name FROM user_copies)
    ),
    direct_matches AS (
      SELECT DISTINCT ms.copy_id, al.id AS listing_id
      FROM missing_slots ms
      JOIN active_listings al ON al.collection_name = ms.collection_name
        AND al.sticker_number = ms.slot_number::TEXT
        AND (al.page_title IS NULL OR al.page_title = ms.page_title)
      WHERE COALESCE(al.is_group, false) = false
    ),
    pack_matches AS (
      SELECT DISTINCT ms.copy_id, al.id AS listing_id
      FROM missing_slots ms
      JOIN active_listings al ON al.collection_name = ms.collection_name
        AND al.is_group = true
      JOIN listing_pack_items lpi ON lpi.listing_id = al.id
        AND lpi.template_id = ms.tmpl_id
        AND lpi.slot_number = ms.slot_number
        AND COALESCE(lpi.slot_variant, '') = COALESCE(ms.slot_variant, '')
        AND (lpi.page_title IS NULL OR lpi.page_title = ms.page_title)
    ),
    all_matches AS (
      SELECT copy_id, listing_id FROM direct_matches
      UNION
      SELECT copy_id, listing_id FROM pack_matches
    )
    SELECT jsonb_agg(jsonb_build_object('copy_id', sub.copy_id, 'missing_in_marketplace', sub.cnt))
    INTO v_result
    FROM (
      SELECT uc.copy_id, COALESCE(am.cnt, 0) AS cnt
      FROM user_copies uc
      LEFT JOIN (
        SELECT copy_id, COUNT(DISTINCT listing_id) AS cnt
        FROM all_matches
        GROUP BY copy_id
      ) am ON am.copy_id = uc.copy_id
    ) sub;

    RETURN COALESCE(v_result, '[]'::jsonb);

  ELSE
    WITH copy_info AS (
      SELECT utc.id AS copy_id,
             COALESCE(utc.template_id, utc.original_template_id) AS tmpl_id,
             COALESCE(ct.title, utc.title) AS collection_name
      FROM user_template_copies utc
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      WHERE utc.id = p_copy_id AND utc.user_id = v_user_id
    ),
    missing_slots AS (
      SELECT ts.id AS slot_id, ts.slot_number, ts.slot_variant, ts.label,
             tp.title AS page_title, ci.tmpl_id, ci.collection_name
      FROM copy_info ci
      JOIN template_slots ts ON ts.template_id = ci.tmpl_id
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = ci.copy_id
      WHERE utp.slot_id IS NULL OR utp.status = 'missing'
    ),
    active_listings AS (
      SELECT tl.id, tl.collection_name, tl.sticker_number, tl.page_title, tl.is_group
      FROM trade_listings tl
      WHERE tl.status = 'active'
        AND tl.deleted_at IS NULL
        AND tl.user_id != v_user_id
        AND tl.collection_name = (SELECT collection_name FROM copy_info LIMIT 1)
    ),
    direct_matches AS (
      SELECT ms.slot_id, ms.slot_number, ms.slot_variant, ms.label, ms.page_title, al.id AS listing_id
      FROM missing_slots ms
      JOIN active_listings al ON al.sticker_number = ms.slot_number::TEXT
        AND (al.page_title IS NULL OR al.page_title = ms.page_title)
      WHERE COALESCE(al.is_group, false) = false
    ),
    pack_matches AS (
      SELECT ms.slot_id, ms.slot_number, ms.slot_variant, ms.label, ms.page_title, al.id AS listing_id
      FROM missing_slots ms
      JOIN active_listings al ON al.is_group = true
      JOIN listing_pack_items lpi ON lpi.listing_id = al.id
        AND lpi.template_id = (SELECT tmpl_id FROM copy_info LIMIT 1)
        AND lpi.slot_number = ms.slot_number
        AND COALESCE(lpi.slot_variant, '') = COALESCE(ms.slot_variant, '')
        AND (lpi.page_title IS NULL OR lpi.page_title = ms.page_title)
    ),
    all_matches AS (
      SELECT slot_id, slot_number, slot_variant, label, page_title, listing_id FROM direct_matches
      UNION
      SELECT slot_id, slot_number, slot_variant, label, page_title, listing_id FROM pack_matches
    ),
    dupe_users AS (
      SELECT ms.slot_id, COUNT(DISTINCT utp_other.user_id) AS dupe_user_count
      FROM missing_slots ms
      JOIN user_template_copies utc_other
        ON utc_other.template_id = (SELECT tmpl_id FROM copy_info LIMIT 1)
        AND utc_other.user_id != v_user_id
      JOIN user_template_progress utp_other
        ON utp_other.copy_id = utc_other.id
        AND utp_other.slot_id = ms.slot_id
        AND (utp_other.status = 'duplicate' OR utp_other.count > 1)
      GROUP BY ms.slot_id
    ),
    combined_slots AS (
      SELECT 
        ms.slot_id,
        ms.slot_number,
        ms.slot_variant,
        ms.label,
        ms.page_title,
        COUNT(DISTINCT am.listing_id) AS listing_count,
        COALESCE(du.dupe_user_count, 0) > 0 AS has_users_with_dupe
      FROM missing_slots ms
      LEFT JOIN all_matches am ON am.slot_id = ms.slot_id
      LEFT JOIN dupe_users du ON du.slot_id = ms.slot_id
      GROUP BY ms.slot_id, ms.slot_number, ms.slot_variant, ms.label, ms.page_title, du.dupe_user_count
      HAVING COUNT(DISTINCT am.listing_id) > 0 OR COALESCE(du.dupe_user_count, 0) > 0
    )
    SELECT jsonb_agg(jsonb_build_object(
      'slot_id', cs.slot_id,
      'slot_number', cs.slot_number,
      'slot_variant', cs.slot_variant,
      'label', cs.label,
      'page_title', cs.page_title,
      'listing_count', cs.listing_count,
      'has_users_with_dupe', cs.has_users_with_dupe
    ))
    INTO v_result
    FROM combined_slots cs;

    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;
END;
$function$;

-- 2. find_users_with_duplicate_slot
CREATE OR REPLACE FUNCTION public.find_users_with_duplicate_slot(
  p_slot_id bigint,
  p_copy_id bigint
)
RETURNS TABLE (
  match_user_id uuid,
  nickname text,
  avatar_url text,
  postcode text,
  overlap_from_them_to_me integer,
  overlap_from_me_to_them integer,
  total_mutual_overlap integer,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET work_mem = '16MB'
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_template_id bigint;
  v_my_lat double precision;
  v_my_lon double precision;
  v_my_country text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get template_id for current copy
  SELECT template_id INTO v_template_id
  FROM user_template_copies
  WHERE id = p_copy_id AND user_id = v_user_id;

  IF v_template_id IS NULL THEN
    RETURN;
  END IF;

  -- Get my postal code coordinates if available
  SELECT p.country_code, pc.lat, pc.lon
  INTO v_my_country, v_my_lat, v_my_lon
  FROM profiles p
  LEFT JOIN postal_codes pc ON pc.postcode = p.postcode AND pc.country = p.country_code
  WHERE p.id = v_user_id;

  RETURN QUERY
  WITH my_slots AS (
    SELECT
      utp.slot_id,
      (utp.status = 'missing' OR utp.count = 0) AS is_missing,
      (utp.status = 'duplicate' OR utp.count > 1) AS is_dupe
    FROM user_template_progress utp
    WHERE utp.copy_id = p_copy_id
      AND ((utp.status = 'missing' OR utp.count = 0) OR (utp.status = 'duplicate' OR utp.count > 1))
  ),
  other_users_with_target_slot AS (
    SELECT DISTINCT utc.id AS their_copy_id, utc.user_id AS their_user_id
    FROM user_template_copies utc
    JOIN user_template_progress utp ON utp.copy_id = utc.id AND utp.slot_id = p_slot_id
    WHERE utc.template_id = v_template_id
      AND utc.user_id != v_user_id
      AND (utp.status = 'duplicate' OR utp.count > 1)
  ),
  mutual_matches AS (
    SELECT
      ou.their_user_id,
      COUNT(DISTINCT CASE
        WHEN (tp_them.status = 'duplicate' OR tp_them.count > 1) AND ms.is_missing THEN ms.slot_id
      END)::integer AS ov_them_to_me,
      COUNT(DISTINCT CASE
        WHEN (tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe THEN ms.slot_id
      END)::integer AS ov_me_to_them
    FROM other_users_with_target_slot ou
    JOIN user_template_progress tp_them ON tp_them.copy_id = ou.their_copy_id
    JOIN my_slots ms ON ms.slot_id = tp_them.slot_id
    WHERE ((tp_them.status = 'duplicate' OR tp_them.count > 1) AND ms.is_missing)
       OR ((tp_them.status = 'missing' OR tp_them.count = 0) AND ms.is_dupe)
    GROUP BY ou.their_user_id
  )
  SELECT
    mm.their_user_id AS match_user_id,
    COALESCE(p.nickname, 'Usuario')::text AS nickname,
    p.avatar_url,
    p.postcode,
    mm.ov_them_to_me AS overlap_from_them_to_me,
    mm.ov_me_to_them AS overlap_from_me_to_them,
    (mm.ov_them_to_me + mm.ov_me_to_them) AS total_mutual_overlap,
    CASE
      WHEN v_my_lat IS NOT NULL AND v_my_lon IS NOT NULL AND pc.lat IS NOT NULL AND pc.lon IS NOT NULL
      THEN haversine_distance(v_my_lat, v_my_lon, pc.lat, pc.lon)
      ELSE NULL
    END AS distance_km
  FROM mutual_matches mm
  JOIN profiles p ON p.id = mm.their_user_id
  LEFT JOIN postal_codes pc ON pc.country = p.country_code AND pc.postcode = p.postcode
  ORDER BY
    (mm.ov_them_to_me + mm.ov_me_to_them) DESC,
    mm.ov_me_to_them DESC,
    p.nickname ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_users_with_duplicate_slot(bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_with_duplicate_slot(bigint, bigint) TO anon;

-- 3. list_trade_listings_with_collection_filter
DROP FUNCTION IF EXISTS public.list_trade_listings_with_collection_filter(integer, integer, text, text, boolean, bigint[], text, boolean);

CREATE OR REPLACE FUNCTION public.list_trade_listings_with_collection_filter(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_viewer_postcode text DEFAULT NULL::text,
  p_sort_by_distance boolean DEFAULT false,
  p_collection_ids bigint[] DEFAULT NULL::bigint[],
  p_country_code text DEFAULT NULL::text,
  p_is_group boolean DEFAULT NULL::boolean,
  p_slot_id bigint DEFAULT NULL::bigint
)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  author_nickname text,
  author_avatar_url text,
  author_postcode text,
  title text,
  description text,
  sticker_number text,
  collection_name text,
  image_url text,
  thumbnail_url text,
  status text,
  views_count integer,
  created_at timestamp with time zone,
  copy_id bigint,
  slot_id bigint,
  distance_km numeric,
  match_score integer,
  is_group boolean,
  group_count integer,
  author_completed_trades integer,
  is_highlighted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_template_ids BIGINT[];
    v_search_query tsquery;
    v_viewer_country TEXT;
    v_slot_template_id BIGINT;
    v_slot_number INT;
    v_slot_variant TEXT;
BEGIN
    v_viewer_id := auth.uid();

    IF v_viewer_id IS NOT NULL THEN
      SELECT prof.country_code INTO v_viewer_country
      FROM profiles prof WHERE prof.id = v_viewer_id;
      v_viewer_country := COALESCE(v_viewer_country, 'ES');
    END IF;

    IF p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
        SELECT lat, lon
        INTO v_viewer_lat, v_viewer_lon
        FROM postal_codes
        WHERE postcode = p_viewer_postcode
          AND country = COALESCE(v_viewer_country, 'ES')
        LIMIT 1;
    END IF;

    IF p_slot_id IS NOT NULL THEN
        SELECT ts.template_id, ts.slot_number, ts.slot_variant
        INTO v_slot_template_id, v_slot_number, v_slot_variant
        FROM template_slots ts WHERE ts.id = p_slot_id;
    END IF;

    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT utc.template_id)
        INTO v_template_ids
        FROM user_template_copies utc
        WHERE utc.id = ANY(p_collection_ids);
    END IF;

    IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
        SELECT to_tsquery('spanish', string_agg(token || ':*', ' & '))
        INTO v_search_query
        FROM unnest(string_to_array(trim(regexp_replace(regexp_replace(p_search, '[&|!():*]', '', 'g'), '\s+', ' ', 'g')), ' ')) as token;
    END IF;

    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar_url,
        p.postcode AS author_postcode,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.thumbnail_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        tl.copy_id,
        tl.slot_id,
        CASE
            WHEN v_viewer_lat IS NOT NULL AND v_viewer_lon IS NOT NULL AND pc.lat IS NOT NULL THEN
                ROUND(haversine_distance(v_viewer_lat, v_viewer_lon, pc.lat, pc.lon)::NUMERIC, 1)
            ELSE NULL
        END AS distance_km,
        CASE
            WHEN v_template_ids IS NOT NULL AND (
                EXISTS (
                    SELECT 1 FROM user_template_copies utc2
                    WHERE utc2.id = tl.copy_id
                    AND utc2.template_id = ANY(v_template_ids)
                )
                OR (tl.is_group = true AND EXISTS (
                    SELECT 1 FROM listing_pack_items lpi
                    WHERE lpi.listing_id = tl.id
                    AND lpi.template_id = ANY(v_template_ids)
                ))
            ) THEN 2
            WHEN p_collection_ids IS NULL THEN 0
            ELSE -1
        END AS match_score,
        tl.is_group,
        tl.group_count,
        p.completed_trades AS author_completed_trades,
        (EXISTS (
          SELECT 1 FROM public.listing_highlights lh2
          WHERE lh2.listing_id = tl.id AND lh2.expires_at > now()
        )) AS is_highlighted
    FROM trade_listings tl
    INNER JOIN profiles p ON p.id = tl.user_id
    LEFT JOIN postal_codes pc
        ON pc.postcode = p.postcode
        AND pc.country = p.country_code
    WHERE
        tl.status = 'active'
        AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)
        AND (v_viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM ignored_users iu
            WHERE iu.user_id = v_viewer_id
            AND iu.ignored_user_id = tl.user_id
        ))
        AND (v_viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM ignored_listings il
            WHERE il.user_id = v_viewer_id
            AND il.listing_id = tl.id
        ))
        AND (p_country_code IS NULL OR tl.country_code = p_country_code)
        AND (p_is_group IS NULL OR tl.is_group = p_is_group)
        AND (
            p_slot_id IS NULL
            OR (
                tl.is_group = false AND (
                    tl.slot_id = p_slot_id
                    OR (
                        v_slot_number IS NOT NULL
                        AND tl.sticker_number = v_slot_number::TEXT
                        AND COALESCE(tl.slot_variant, '') = COALESCE(v_slot_variant, '')
                        AND (v_slot_template_id IS NULL OR EXISTS (
                            SELECT 1 FROM user_template_copies utc3
                            WHERE utc3.id = tl.copy_id AND utc3.template_id = v_slot_template_id
                        ))
                    )
                )
            )
            OR (
                tl.is_group = true AND v_slot_template_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM listing_pack_items lpi_slot
                    WHERE lpi_slot.listing_id = tl.id
                    AND lpi_slot.template_id = v_slot_template_id
                    AND lpi_slot.slot_number = v_slot_number
                    AND COALESCE(lpi_slot.slot_variant, '') = COALESCE(v_slot_variant, '')
                )
            )
        )
        AND (
            p_search IS NULL
            OR tl.sticker_number = p_search
            OR tl.sticker_number = LTRIM(p_search, '#')
            OR (v_search_query IS NOT NULL AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '') || ' ' || COALESCE(tl.description, '')) @@ v_search_query)
            OR (length(p_search) < 4 AND (tl.title ILIKE '%' || p_search || '%' OR tl.collection_name ILIKE '%' || p_search || '%' OR tl.description ILIKE '%' || p_search || '%' OR tl.sticker_number ILIKE '%' || p_search || '%'))
            OR (tl.title ILIKE '%' || p_search || '%' OR tl.collection_name ILIKE '%' || p_search || '%' OR tl.description ILIKE '%' || p_search || '%')
            OR (
                tl.is_group = true
                AND EXISTS (
                    SELECT 1 FROM listing_pack_items lpi_s
                    WHERE lpi_s.listing_id = tl.id
                    AND (
                        lpi_s.slot_number::TEXT = p_search
                        OR lpi_s.slot_number::TEXT = LTRIM(p_search, '#')
                        OR (length(p_search) < 4 AND lpi_s.slot_number::TEXT ILIKE '%' || p_search || '%')
                        OR lpi_s.label ILIKE '%' || p_search || '%'
                        OR lpi_s.page_title ILIKE '%' || p_search || '%'
                    )
                )
            )
        )
        AND (
            p_collection_ids IS NULL
            OR EXISTS (
                SELECT 1 FROM user_template_copies utc2
                WHERE utc2.id = tl.copy_id
                AND utc2.template_id = ANY(v_template_ids)
            )
            OR (tl.is_group = true AND EXISTS (
                SELECT 1 FROM listing_pack_items lpi
                WHERE lpi.listing_id = tl.id
                AND lpi.template_id = ANY(v_template_ids)
            ))
        )
    ORDER BY
        (EXISTS (
          SELECT 1 FROM public.listing_highlights lh2
          WHERE lh2.listing_id = tl.id AND lh2.expires_at > now()
        )) DESC,
        match_score DESC,
        CASE WHEN p_sort_by_distance THEN 0 ELSE 1 END ASC,
        CASE
            WHEN p_sort_by_distance AND v_viewer_lat IS NOT NULL THEN
                COALESCE(haversine_distance(v_viewer_lat, v_viewer_lon, pc.lat, pc.lon), 999999)
            ELSE 999999
        END ASC NULLS LAST,
        tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

GRANT ALL ON FUNCTION public.list_trade_listings_with_collection_filter(integer, integer, text, text, boolean, bigint[], text, boolean, bigint) TO anon;
GRANT ALL ON FUNCTION public.list_trade_listings_with_collection_filter(integer, integer, text, text, boolean, bigint[], text, boolean, bigint) TO authenticated;
GRANT ALL ON FUNCTION public.list_trade_listings_with_collection_filter(integer, integer, text, text, boolean, bigint[], text, boolean, bigint) TO service_role;
