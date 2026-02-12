-- Fix get_marketplace_availability RPC: two bugs
--
-- BUG 1: Used "utp.slot_id IS NULL" to detect missing stickers,
-- but user_template_progress pre-populates ALL slots with status='missing'
-- when a user browses album pages. This caused the RPC to treat every
-- browsed slot as "owned", returning 0 availability for fully-browsed albums.
-- FIX: Changed to (utp.slot_id IS NULL OR utp.status = 'missing')
--
-- BUG 2: Matched listings to template_slots by slot_number alone.
-- In albums with per-page numbering (e.g. LALIGA), each team page has its
-- own #1-#20, so slot_number=9 matches ~24 different slots across pages.
-- This caused massive overcounting (467 instead of 154).
-- FIX: Added template_pages join and page_title matching for both pack
-- items and individual listings.

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
    -- COUNTS MODE: For each user album, count missing stickers with active marketplace listings
    SELECT jsonb_agg(jsonb_build_object('copy_id', sub.copy_id, 'missing_in_marketplace', sub.cnt))
    INTO v_result
    FROM (
      SELECT
        utc.id AS copy_id,
        COUNT(DISTINCT ts.id) AS cnt
      FROM user_template_copies utc
      JOIN collection_templates ct ON ct.id = utc.template_id
      JOIN template_slots ts ON ts.template_id = ct.id
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
      JOIN trade_listings tl ON (
        tl.status = 'active'
        AND tl.user_id != v_user_id
        AND tl.deleted_at IS NULL
        AND tl.collection_name = ct.title
        AND (
          -- Individual sticker: match by sticker_number + page_title
          (
            COALESCE(tl.is_group, false) = false
            AND tl.sticker_number = ts.slot_number::TEXT
            AND (tl.page_title IS NULL OR tl.page_title = tp.title)
          )
          OR
          -- Pack: match via listing_pack_items (handled by LEFT JOIN below)
          (tl.is_group = true)
        )
      )
      -- For packs, require a matching item with page_title disambiguation
      LEFT JOIN listing_pack_items lpi ON (
        tl.is_group = true
        AND lpi.listing_id = tl.id
        AND lpi.template_id = ct.id
        AND lpi.slot_number = ts.slot_number
        AND COALESCE(lpi.slot_variant, '') = COALESCE(ts.slot_variant, '')
        AND (lpi.page_title IS NULL OR lpi.page_title = tp.title)
      )
      WHERE utc.user_id = v_user_id
        AND (utp.slot_id IS NULL OR utp.status = 'missing')  -- Missing sticker
        AND (COALESCE(tl.is_group, false) = false OR lpi.id IS NOT NULL)
      GROUP BY utc.id
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
        COUNT(DISTINCT tl.id) AS listing_count
      FROM user_template_copies utc
      JOIN collection_templates ct ON ct.id = utc.template_id
      JOIN template_slots ts ON ts.template_id = ct.id
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
      JOIN trade_listings tl ON (
        tl.status = 'active'
        AND tl.user_id != v_user_id
        AND tl.deleted_at IS NULL
        AND tl.collection_name = ct.title
        AND (
          (
            COALESCE(tl.is_group, false) = false
            AND tl.sticker_number = ts.slot_number::TEXT
            AND (tl.page_title IS NULL OR tl.page_title = tp.title)
          )
          OR
          (tl.is_group = true)
        )
      )
      LEFT JOIN listing_pack_items lpi ON (
        tl.is_group = true
        AND lpi.listing_id = tl.id
        AND lpi.template_id = ct.id
        AND lpi.slot_number = ts.slot_number
        AND COALESCE(lpi.slot_variant, '') = COALESCE(ts.slot_variant, '')
        AND (lpi.page_title IS NULL OR lpi.page_title = tp.title)
      )
      WHERE utc.id = p_copy_id
        AND utc.user_id = v_user_id
        AND (utp.slot_id IS NULL OR utp.status = 'missing')
        AND (COALESCE(tl.is_group, false) = false OR lpi.id IS NOT NULL)
      GROUP BY ts.id, ts.slot_number, ts.slot_variant, ts.label, tp.title
    ) sub;

    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;
END;
$function$;
