-- Migration: Schedule daily cron job for listing expiration processing
-- Runs at 4:00 AM UTC every day

DO $do$
BEGIN
    -- Only create the cron job if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'process-listing-expiration'
    ) THEN
        PERFORM cron.schedule(
            'process-listing-expiration',
            '0 4 * * *',
            $$
            SELECT
              net.http_post(
                url := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/process-listing-expiration',
                headers := jsonb_build_object(
                  'Content-Type', 'application/json',
                  'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
                ),
                body := '{}'::jsonb
              ) AS request_id;
            $$
        );
    END IF;
END
$do$;

-- ============================================================
-- Update get_my_listings_with_progress to include expiration columns
-- ============================================================
DROP FUNCTION IF EXISTS public.get_my_listings_with_progress(text);
CREATE OR REPLACE FUNCTION public.get_my_listings_with_progress(p_status text DEFAULT NULL)
RETURNS TABLE(
    id bigint,
    title text,
    description text,
    sticker_number text,
    collection_name text,
    image_url text,
    status text,
    views_count integer,
    created_at timestamptz,
    copy_id bigint,
    copy_title text,
    template_title text,
    page_number integer,
    slot_number integer,
    slot_label text,
    current_status text,
    current_count integer,
    sync_status text,
    page_title text,
    slot_variant text,
    global_number integer,
    deleted_at timestamptz,
    scheduled_for timestamptz,
    expiry_scheduled_at timestamptz,
    expiry_warning_sent_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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
        -- Template information
        utc.id AS copy_id,
        utc.title AS copy_title,
        ct.title AS template_title,
        tp.page_number,
        ts.slot_number,
        ts.label AS slot_label,
        -- Sync information
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
        -- Panini metadata
        tl.page_title,
        tl.slot_variant,
        tl.global_number,
        -- Deletion fields
        tl.deleted_at,
        rs.scheduled_for,
        -- Expiration fields
        tl.expiry_scheduled_at,
        tl.expiry_warning_sent_at
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
$$;

COMMENT ON FUNCTION public.get_my_listings_with_progress(text) IS 'Gets user''s listings with optional template progress information, Panini metadata, deletion schedule, and expiration tracking';
