-- Migration: fix_marketplace_availability_timeout
CREATE OR REPLACE FUNCTION public.get_marketplace_availability(p_copy_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF p_copy_id IS NULL THEN
    -- COUNTS MODE: For each user álbum, count missing stickers with active marketplace listings
    -- OPTIMIZED: Avoid Cartesian explosion by using EXISTS instead of massive LEFT JOINs
    SELECT jsonb_agg(jsonb_build_object('copy_id', sub.copy_id, 'missing_in_marketplace', sub.cnt))
    INTO v_result
    FROM (
      SELECT
        utc.id AS copy_id,
        (
          SELECT COUNT(DISTINCT tl.id)
          FROM trade_listings tl
          WHERE tl.status = 'active'
            AND tl.user_id != v_user_id
            AND tl.deleted_at IS NULL
            AND tl.collection_name = COALESCE(ct.title, utc.title)
            AND EXISTS (
              SELECT 1
              FROM template_slots ts
              JOIN template_pages tp ON tp.id = ts.page_id
              LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
              WHERE ts.template_id = COALESCE(utc.template_id, utc.original_template_id)
                AND (utp.slot_id IS NULL OR utp.status = 'missing')
                AND (
                  (COALESCE(tl.is_group, false) = false AND tl.sticker_number = ts.slot_number::TEXT AND (tl.page_title IS NULL OR tl.page_title = tp.title))
                  OR
                  (tl.is_group = true AND EXISTS (
                     SELECT 1 FROM listing_pack_items lpi 
                     WHERE lpi.listing_id = tl.id 
                       AND lpi.template_id = COALESCE(utc.template_id, utc.original_template_id)
                       AND lpi.slot_number = ts.slot_number
                       AND COALESCE(lpi.slot_variant, '') = COALESCE(ts.slot_variant, '')
                       AND (lpi.page_title IS NULL OR lpi.page_title = tp.title)
                  ))
                )
            )
        ) AS cnt
      FROM user_template_copies utc
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      WHERE utc.user_id = v_user_id
    ) sub;

    RETURN COALESCE(v_result, '[]'::jsonb);

  ELSE
    -- SLOTS MODE: For a specific copy, list which missing slots have marketplace listings
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
      SELECT
        ts.id AS slot_id,
        ts.slot_number,
        ts.slot_variant,
        ts.label,
        tp.title AS page_title,
        (
          SELECT COUNT(DISTINCT tl.id)
          FROM trade_listings tl
          WHERE tl.status = 'active'
            AND tl.user_id != v_user_id
            AND tl.deleted_at IS NULL
            AND tl.collection_name = COALESCE(ct.title, utc.title)
            AND (
              (COALESCE(tl.is_group, false) = false AND tl.sticker_number = ts.slot_number::TEXT AND (tl.page_title IS NULL OR tl.page_title = tp.title))
              OR
              (tl.is_group = true AND EXISTS (
                 SELECT 1 FROM listing_pack_items lpi 
                 WHERE lpi.listing_id = tl.id 
                   AND lpi.template_id = COALESCE(utc.template_id, utc.original_template_id)
                   AND lpi.slot_number = ts.slot_number
                   AND COALESCE(lpi.slot_variant, '') = COALESCE(ts.slot_variant, '')
                   AND (lpi.page_title IS NULL OR lpi.page_title = tp.title)
              ))
            )
        ) AS listing_count
      FROM user_template_copies utc
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      JOIN template_slots ts ON ts.template_id = COALESCE(utc.template_id, utc.original_template_id)
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
      WHERE utc.id = p_copy_id
        AND utc.user_id = v_user_id
        AND (utp.slot_id IS NULL OR utp.status = 'missing')
    ) sub
    WHERE sub.listing_count > 0;

    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;
END;
$function$;
