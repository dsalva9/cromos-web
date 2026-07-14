-- Migration: Add is_highlighted to get_my_listings_with_progress RPC
-- This allows the My Listings page to show the highlighted badge

DROP FUNCTION IF EXISTS public.get_my_listings_with_progress(text);

CREATE OR REPLACE FUNCTION public.get_my_listings_with_progress(p_status text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, title text, description text, sticker_number text, collection_name text, image_url text, status text, views_count integer, created_at timestamp with time zone, copy_id bigint, copy_title text, template_title text, page_number integer, slot_number integer, slot_label text, current_status text, current_count integer, sync_status text, page_title text, slot_variant text, global_number integer, deleted_at timestamp with time zone, scheduled_for timestamp with time zone, expiry_scheduled_at timestamp with time zone, expiry_warning_sent_at timestamp with time zone, is_highlighted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        utc.id AS copy_id,
        utc.title AS copy_title,
        ct.title AS template_title,
        tp.page_number,
        ts.slot_number,
        ts.label AS slot_label,
        COALESCE(utp.status, 'missing') AS current_status,
        COALESCE(utp.count, 0) AS current_count,
        CASE
            WHEN tl.copy_id IS NULL OR tl.slot_id IS NULL THEN 'not_applicable'
            WHEN tl.status = 'active' AND COALESCE(utp.status, 'missing') != 'duplicate' THEN 'out_of_sync'
            WHEN tl.status = 'sold' AND (
                COALESCE(utp.status, 'missing') = 'missing' OR
                (COALESCE(utp.status, 'missing') = 'owned' AND COALESCE(utp.count, 0) = 0) OR
                (COALESCE(utp.status, 'missing') = 'duplicate' AND COALESCE(utp.count, 0) = 0)
            ) THEN 'out_of_sync'
            ELSE 'in_sync'
        END AS sync_status,
        tl.page_title,
        tl.slot_variant,
        tl.global_number,
        tl.deleted_at,
        rs.scheduled_for,
        tl.expiry_scheduled_at,
        tl.expiry_warning_sent_at,
        EXISTS (
            SELECT 1 FROM listing_highlights lh
            WHERE lh.listing_id = tl.id
            AND lh.expires_at > now()
        ) AS is_highlighted
    FROM trade_listings tl
    LEFT JOIN user_template_copies utc ON tl.copy_id = utc.id
    LEFT JOIN collection_templates ct ON utc.template_id = ct.id
    LEFT JOIN template_slots ts ON tl.slot_id = ts.id
    LEFT JOIN template_pages tp ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON (
        utp.copy_id = tl.copy_id
        AND utp.slot_id = tl.slot_id
        AND utp.user_id = tl.user_id
    )
    LEFT JOIN retention_schedule rs ON (
        rs.entity_type = 'listing'
        AND rs.entity_id = tl.id::TEXT
    )
    WHERE tl.user_id = auth.uid()
    AND (p_status IS NULL OR tl.status = p_status)
    ORDER BY tl.created_at DESC;
END;
$function$
