-- Migration: 20260901113200_fix_availability_no_pack_matches.sql
-- Description: Remove pack_matches from get_marketplace_availability.
-- Only individual listings (is_group=false) with matching sticker_number
-- count as "available in marketplace". Pack listings that happen to contain
-- a sticker as one of many items should NOT mark it as available.
-- The has_users_with_dupe flag remains for showing the "Usuarios con repe" button.

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
    )
    SELECT jsonb_agg(jsonb_build_object('copy_id', sub.copy_id, 'missing_in_marketplace', sub.cnt))
    INTO v_result
    FROM (
      SELECT uc.copy_id, COALESCE(am.cnt, 0) AS cnt
      FROM user_copies uc
      LEFT JOIN (
        SELECT copy_id, COUNT(DISTINCT listing_id) AS cnt
        FROM direct_matches
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
        COUNT(DISTINCT dm.listing_id) AS listing_count,
        COALESCE(du.dupe_user_count, 0) > 0 AS has_users_with_dupe
      FROM missing_slots ms
      LEFT JOIN direct_matches dm ON dm.slot_id = ms.slot_id
      LEFT JOIN dupe_users du ON du.slot_id = ms.slot_id
      GROUP BY ms.slot_id, ms.slot_number, ms.slot_variant, ms.label, ms.page_title, du.dupe_user_count
      HAVING COUNT(DISTINCT dm.listing_id) > 0 OR COALESCE(du.dupe_user_count, 0) > 0
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
