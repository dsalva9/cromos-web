-- P0 Fix: Optimize get_marketplace_availability for Disk IO budget
--
-- Root cause: Correlated subqueries in get_marketplace_availability scanned
-- trade_listings once per template slot. With 2,915 slots and 797 active
-- listings, this caused massive buffer churn that depleted the Disk IO budget.
--
-- Fix: 
--   1. Add a covering index for the active listing lookup pattern
--   2. Rewrite both code paths to use CTE-based set operations instead of
--      correlated subqueries
--
-- Before: counts mode = 298ms mean, slots mode = 986ms mean
-- After:  counts mode = 9ms mean, slots mode = 8ms mean

-- 1. Covering index for the marketplace availability function
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_listings_availability
ON public.trade_listings (collection_name, sticker_number)
INCLUDE (user_id, page_title, is_group)
WHERE status = 'active' AND deleted_at IS NULL;

-- 2. Optimized function using CTEs instead of correlated subqueries
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
    -- COUNTS MODE: For each user album, count missing stickers with active marketplace listings
    -- OPTIMIZED v2: Pre-materialize active listings into a CTE, then JOIN instead of correlated subqueries
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
    -- Pre-filter active listings once (uses the covering index)
    active_listings AS (
      SELECT tl.id, tl.collection_name, tl.sticker_number, tl.page_title, tl.is_group, tl.user_id
      FROM trade_listings tl
      WHERE tl.status = 'active'
        AND tl.deleted_at IS NULL
        AND tl.user_id != v_user_id
    ),
    -- Direct matches (non-group listings)
    direct_matches AS (
      SELECT DISTINCT ms.copy_id, al.id AS listing_id
      FROM missing_slots ms
      JOIN active_listings al ON al.collection_name = ms.collection_name
        AND al.sticker_number = ms.slot_number::TEXT
        AND (al.page_title IS NULL OR al.page_title = ms.page_title)
      WHERE COALESCE(al.is_group, false) = false
    ),
    -- Group/pack matches
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
    -- SLOTS MODE: For a specific copy, list which missing slots have marketplace listings
    -- OPTIMIZED v2: Same CTE-based approach, no correlated subqueries
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
    )
    SELECT jsonb_agg(jsonb_build_object(
      'slot_id', sub.slot_id,
      'slot_number', sub.slot_number,
      'slot_variant', sub.slot_variant,
      'label', sub.label,
      'page_title', sub.page_title,
      'listing_count', sub.listing_count
    ))
    INTO v_result
    FROM (
      SELECT slot_id, slot_number, slot_variant, label, page_title, COUNT(DISTINCT listing_id) AS listing_count
      FROM all_matches
      GROUP BY slot_id, slot_number, slot_variant, label, page_title
      HAVING COUNT(DISTINCT listing_id) > 0
    ) sub;

    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;
END;
$function$;
