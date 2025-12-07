-- =====================================================
-- SECURITY: Fix database linter advisories
-- =====================================================
-- Purpose: Enable RLS on retention tables and fix function search paths
-- =====================================================

-- =====================================================
-- 1. Enable RLS on retention_schedule
-- =====================================================
ALTER TABLE retention_schedule ENABLE ROW LEVEL SECURITY;

-- Admins can view all retention schedules
CREATE POLICY "Admins can view all retention schedules"
    ON retention_schedule
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = TRUE
        )
    );

-- Users can view retention schedules for their own entities
CREATE POLICY "Users can view own entity retention schedules"
    ON retention_schedule
    FOR SELECT
    TO authenticated
    USING (
        -- For listings
        (entity_type = 'listing' AND entity_id IN (
            SELECT id::text FROM trade_listings WHERE user_id = auth.uid()
        ))
        OR
        -- For templates
        (entity_type = 'template' AND entity_id IN (
            SELECT id::text FROM collection_templates WHERE author_id = auth.uid()
        ))
        OR
        -- For accounts (own account deletion)
        (entity_type = 'account' AND entity_id = auth.uid()::text)
    );

-- =====================================================
-- 2. Enable RLS on pending_emails
-- =====================================================
ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access pending_emails
CREATE POLICY "Admins can view pending emails"
    ON pending_emails
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = TRUE
        )
    );

-- =====================================================
-- 3. Fix search_path for functions
-- =====================================================

-- Fix get_my_listings_with_progress
DROP FUNCTION IF EXISTS get_my_listings_with_progress(TEXT);

CREATE OR REPLACE FUNCTION get_my_listings_with_progress(
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    -- Template information
    copy_id BIGINT,
    copy_title TEXT,
    template_title TEXT,
    page_number INTEGER,
    slot_number INTEGER,
    slot_label TEXT,
    -- Sync information
    current_status TEXT,
    current_count INTEGER,
    sync_status TEXT,
    -- Panini metadata from trade_listings
    page_title TEXT,
    slot_variant TEXT,
    global_number INTEGER,
    -- Deletion fields
    deleted_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
            -- If listing is not linked to a template, no sync needed
            WHEN tl.copy_id IS NULL OR tl.slot_id IS NULL THEN 'not_applicable'
            -- If listing is active but slot is not duplicate, out of sync
            WHEN tl.status = 'active' AND COALESCE(utp.status, 'missing') != 'duplicate' THEN 'out_of_sync'
            -- If listing is sold but slot doesn't reflect it, out of sync
            WHEN tl.status = 'sold' AND (
                -- Check if slot count reflects the sale
                COALESCE(utp.status, 'missing') = 'missing' OR
                (COALESCE(utp.status, 'missing') = 'owned' AND COALESCE(utp.count, 0) = 0) OR
                (COALESCE(utp.status, 'missing') = 'duplicate' AND COALESCE(utp.count, 0) = 0)
            ) THEN 'out_of_sync'
            -- Otherwise, in sync
            ELSE 'in_sync'
        END AS sync_status,
        -- Panini metadata from trade_listings (not template_pages to show what was saved)
        tl.page_title,
        tl.slot_variant,
        tl.global_number,
        -- Deletion fields
        tl.deleted_at,
        rs.scheduled_for
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
        AND rs.entity_id = tl.id::text
    )
    WHERE tl.user_id = auth.uid()
    AND (p_status IS NULL OR tl.status = p_status)
    ORDER BY tl.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_listings_with_progress TO authenticated;

-- Fix delete_listing
CREATE OR REPLACE FUNCTION delete_listing(listing_id_param BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the listing's user_id
    SELECT user_id INTO v_user_id
    FROM trade_listings
    WHERE id = listing_id_param;

    -- Check if user owns the listing
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Soft delete: set deleted_at and change status
    UPDATE trade_listings
    SET
        deleted_at = NOW(),
        status = 'ELIMINADO'
    WHERE id = listing_id_param;

    -- Create retention schedule entry (30 days retention)
    INSERT INTO retention_schedule (entity_type, entity_id, scheduled_for)
    VALUES ('listing', listing_id_param::text, NOW() + INTERVAL '30 days')
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_listing TO authenticated;

-- Fix delete_template
CREATE OR REPLACE FUNCTION delete_template(template_id_param BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_author_id UUID;
BEGIN
    -- Get the template's author_id
    SELECT author_id INTO v_author_id
    FROM collection_templates
    WHERE id = template_id_param;

    -- Check if user owns the template
    IF v_author_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Soft delete: set deleted_at
    UPDATE collection_templates
    SET deleted_at = NOW()
    WHERE id = template_id_param;

    -- Create retention schedule entry (30 days retention)
    INSERT INTO retention_schedule (entity_type, entity_id, scheduled_for)
    VALUES ('template', template_id_param::text, NOW() + INTERVAL '30 days')
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_template TO authenticated;

-- Fix delete_account
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Mark account for deletion
    UPDATE profiles
    SET deleted_at = NOW()
    WHERE id = auth.uid();

    -- Schedule permanent deletion after 30 days
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        scheduled_for,
        initiated_by
    )
    VALUES (
        'account',
        auth.uid()::text,
        NOW() + INTERVAL '30 days',
        auth.uid()
    )
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_account TO authenticated;

-- Fix cancel_account_deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Remove deleted_at timestamp
    UPDATE profiles
    SET deleted_at = NULL
    WHERE id = auth.uid()
    AND deleted_at IS NOT NULL;

    -- Remove from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_type = 'account'
    AND entity_id = auth.uid()::text;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_account_deletion TO authenticated;

COMMENT ON FUNCTION get_my_listings_with_progress IS 'Gets user''s listings with optional template progress information, Panini metadata, and deletion schedule';
COMMENT ON FUNCTION delete_listing IS 'Soft deletes a listing and schedules it for permanent removal';
COMMENT ON FUNCTION delete_template IS 'Soft deletes a template and schedules it for permanent removal';
COMMENT ON FUNCTION delete_account IS 'Marks user account for deletion and schedules permanent removal';
COMMENT ON FUNCTION cancel_account_deletion IS 'Cancels pending account deletion';
