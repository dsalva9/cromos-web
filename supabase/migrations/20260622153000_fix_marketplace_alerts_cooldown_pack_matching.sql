-- Fix: Remove the 1-hour cooldown check for instant alerts to ensure users do not miss matching listings
-- Also: Support matching pack/group listings via listing_pack_items table for both instant alerts and digests

-- 1. Redefine match_listing_against_instant_alerts function
CREATE OR REPLACE FUNCTION public.match_listing_against_instant_alerts(p_listing_id BIGINT)
RETURNS TABLE (
    alert_id BIGINT,
    alert_user_id UUID,
    alert_search_query TEXT,
    alert_collection_name TEXT,
    alert_slot_info TEXT,
    channel_email BOOLEAN,
    channel_push BOOLEAN,
    channel_in_app BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_listing RECORD;
BEGIN
    -- Fetch listing data
    SELECT
        tl.id, tl.title, tl.description, tl.collection_name,
        tl.sticker_number, tl.user_id AS author_id,
        tl.copy_id, tl.slot_id, tl.status,
        -- Get template info if linked to a slot
        ts.template_id AS linked_template_id,
        ts.slot_number AS linked_slot_number,
        ts.slot_variant AS linked_slot_variant
    INTO v_listing
    FROM public.trade_listings tl
    LEFT JOIN public.template_slots ts ON ts.id = tl.slot_id
    WHERE tl.id = p_listing_id;

    -- Only process active, non-deleted listings
    IF v_listing IS NULL OR v_listing.status != 'active' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        a.id AS alert_id,
        a.user_id AS alert_user_id,
        a.search_query AS alert_search_query,
        ct.title AS alert_collection_name,
        CASE
            WHEN a.slot_number IS NOT NULL
            THEN '#' || a.slot_number || COALESCE(a.slot_variant, '')
            ELSE NULL
        END AS alert_slot_info,
        a.channel_email,
        a.channel_push,
        a.channel_in_app
    FROM public.marketplace_alerts a
    LEFT JOIN public.collection_templates ct ON ct.id = COALESCE(a.collection_id, a.template_id)
    WHERE a.is_active = true
      AND a.frequency = 'instant'
      -- Don't alert the listing author about their own listing
      AND a.user_id != v_listing.author_id
      -- Remove cooldown check so instant alerts catch all listings
      -- Not already matched for this listing
      AND NOT EXISTS (
          SELECT 1 FROM public.marketplace_alert_matches m
          WHERE m.alert_id = a.id AND m.listing_id = p_listing_id
      )
      -- Text search match (if search_query is set)
      AND (
          a.search_query IS NULL
          OR v_listing.title ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.description, '') ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.collection_name, '') ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.sticker_number, '') ILIKE '%' || a.search_query || '%'
      )
      -- Collection match (if collection_id is set)
      AND (
          a.collection_id IS NULL
          OR EXISTS (
              SELECT 1 FROM public.user_template_copies utc
              WHERE utc.id = v_listing.copy_id
                AND utc.template_id = a.collection_id
          )
          -- Support pack listings
          OR EXISTS (
              SELECT 1 FROM public.listing_pack_items lpi
              WHERE lpi.listing_id = p_listing_id
                AND lpi.template_id = a.collection_id
          )
          OR COALESCE(v_listing.collection_name, '') ILIKE '%' || ct.title || '%'
      )
      -- Specific sticker match (if template_id + slot_number are set)
      AND (
          a.template_id IS NULL
          OR (
              v_listing.linked_template_id = a.template_id
              AND (a.slot_number IS NULL OR v_listing.linked_slot_number = a.slot_number)
              AND (a.slot_variant IS NULL OR v_listing.linked_slot_variant = a.slot_variant)
          )
          -- Support pack listings
          OR EXISTS (
              SELECT 1 FROM public.listing_pack_items lpi
              WHERE lpi.listing_id = p_listing_id
                AND lpi.template_id = a.template_id
                AND (a.slot_number IS NULL OR lpi.slot_number = a.slot_number)
                AND (a.slot_variant IS NULL OR lpi.slot_variant = a.slot_variant)
          )
      );
END;
$$;

-- 2. Redefine get_digest_alert_matches function
CREATE OR REPLACE FUNCTION public.get_digest_alert_matches(p_frequency TEXT)
RETURNS TABLE (
    alert_id BIGINT,
    alert_user_id UUID,
    alert_search_query TEXT,
    alert_collection_name TEXT,
    alert_slot_info TEXT,
    channel_email BOOLEAN,
    channel_push BOOLEAN,
    channel_in_app BOOLEAN,
    listing_id BIGINT,
    listing_title TEXT,
    listing_collection_name TEXT,
    listing_sticker_number TEXT,
    listing_image_url TEXT,
    listing_author_nickname TEXT,
    listing_created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT
        a.id AS alert_id,
        a.user_id AS alert_user_id,
        a.search_query AS alert_search_query,
        ct.title AS alert_collection_name,
        CASE
            WHEN a.slot_number IS NOT NULL
            THEN '#' || a.slot_number || COALESCE(a.slot_variant, '')
            ELSE NULL
        END AS alert_slot_info,
        a.channel_email,
        a.channel_push,
        a.channel_in_app,
        tl.id AS listing_id,
        tl.title AS listing_title,
        tl.collection_name AS listing_collection_name,
        tl.sticker_number AS listing_sticker_number,
        tl.image_url AS listing_image_url,
        p.nickname AS listing_author_nickname,
        tl.created_at AS listing_created_at
    FROM public.marketplace_alerts a
    LEFT JOIN public.collection_templates ct ON ct.id = COALESCE(a.collection_id, a.template_id)
    CROSS JOIN LATERAL (
        SELECT tl2.*
        FROM public.trade_listings tl2
        WHERE tl2.status = 'active'
          AND tl2.deleted_at IS NULL
          -- Only listings created/updated after last digest
          AND tl2.created_at > COALESCE(a.last_digest_at, a.created_at)
          -- Don't alert about user's own listings
          AND tl2.user_id != a.user_id
          -- Not already matched
          AND NOT EXISTS (
              SELECT 1 FROM public.marketplace_alert_matches m
              WHERE m.alert_id = a.id AND m.listing_id = tl2.id
          )
          -- Text search match
          AND (
              a.search_query IS NULL
              OR tl2.title ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.description, '') ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.collection_name, '') ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.sticker_number, '') ILIKE '%' || a.search_query || '%'
          )
          -- Collection match
          AND (
              a.collection_id IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.user_template_copies utc
                  WHERE utc.id = tl2.copy_id
                    AND utc.template_id = a.collection_id
              )
              -- Support pack listings
              OR EXISTS (
                  SELECT 1 FROM public.listing_pack_items lpi
                  WHERE lpi.listing_id = tl2.id
                    AND lpi.template_id = a.collection_id
              )
              OR COALESCE(tl2.collection_name, '') ILIKE '%' || ct.title || '%'
          )
          -- Specific sticker match
          AND (
              a.template_id IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.template_slots ts
                  WHERE ts.id = tl2.slot_id
                    AND ts.template_id = a.template_id
                    AND (a.slot_number IS NULL OR ts.slot_number = a.slot_number)
                    AND (a.slot_variant IS NULL OR ts.slot_variant = a.slot_variant)
              )
              -- Support pack listings
              OR EXISTS (
                  SELECT 1 FROM public.listing_pack_items lpi
                  WHERE lpi.listing_id = tl2.id
                    AND lpi.template_id = a.template_id
                    AND (a.slot_number IS NULL OR lpi.slot_number = a.slot_number)
                    AND (a.slot_variant IS NULL OR lpi.slot_variant = a.slot_variant)
              )
          )
        ORDER BY tl2.created_at DESC
        LIMIT 50  -- Cap matches per alert per digest
    ) tl
    LEFT JOIN public.profiles p ON p.id = tl.user_id
    WHERE a.is_active = true
      AND a.frequency = p_frequency
    ORDER BY a.user_id, a.id, tl.created_at DESC;
$$;

-- 3. Drop/recreate/update index to not include last_triggered_at if it's no longer used for filtering
DROP INDEX IF EXISTS public.idx_marketplace_alerts_active_instant;
CREATE INDEX idx_marketplace_alerts_active_instant
    ON public.marketplace_alerts(is_active, frequency)
    WHERE is_active = true AND frequency = 'instant';
