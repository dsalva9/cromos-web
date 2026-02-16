-- Migration: Fix get_marketplace_availability for orphaned álbumes
--
-- Problem: After a colección (template) is hard-deleted, álbumes (copies) 
-- become orphaned (template_id = NULL). The marketplace availability RPC
-- uses INNER JOINs through collection_templates which fail for orphaned álbumes,
-- breaking:
--   - Dashboard "X cromos disponibles en marketplace"
--   - Missing sticker → "Ver en marketplace" links
--
-- Fix: Use LEFT JOIN on collection_templates and COALESCE to fall back to
-- the álbum's own title and original_template_id for orphaned copies.
-- Join slots via original_template_id (which is never NULLed) instead of
-- going through collection_templates.

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
    SELECT jsonb_agg(jsonb_build_object('copy_id', sub.copy_id, 'missing_in_marketplace', sub.cnt))
    INTO v_result
    FROM (
      SELECT
        utc.id AS copy_id,
        COUNT(DISTINCT ts.id) AS cnt
      FROM user_template_copies utc
      -- LEFT JOIN: template may have been deleted (orphaned álbum)
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      -- Use original_template_id to find slots even when template is deleted
      -- (slots survive deletion with template_id = NULL, but original_template_id
      --  on the copy preserves the link)
      JOIN template_slots ts ON ts.template_id = COALESCE(utc.template_id, utc.original_template_id)
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
      JOIN trade_listings tl ON (
        tl.status = 'active'
        AND tl.user_id != v_user_id
        AND tl.deleted_at IS NULL
        -- Fall back to álbum title when template is deleted
        AND tl.collection_name = COALESCE(ct.title, utc.title)
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
        AND lpi.template_id = COALESCE(utc.template_id, utc.original_template_id)
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
      LEFT JOIN collection_templates ct ON ct.id = utc.template_id
      JOIN template_slots ts ON ts.template_id = COALESCE(utc.template_id, utc.original_template_id)
      JOIN template_pages tp ON tp.id = ts.page_id
      LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
      JOIN trade_listings tl ON (
        tl.status = 'active'
        AND tl.user_id != v_user_id
        AND tl.deleted_at IS NULL
        AND tl.collection_name = COALESCE(ct.title, utc.title)
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
        AND lpi.template_id = COALESCE(utc.template_id, utc.original_template_id)
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
