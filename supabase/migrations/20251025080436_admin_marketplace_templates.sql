-- =====================================================
-- ADMIN: Marketplace and Templates Oversight
-- =====================================================
-- Purpose: Admin functions for managing marketplace listings and templates
-- =====================================================

-- Add status column to marketplace listings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marketplace_listings' AND column_name = 'status'
    ) THEN
        ALTER TABLE marketplace_listings ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'completed', 'suspended', 'removed'));
        ALTER TABLE marketplace_listings ADD COLUMN suspended_at TIMESTAMPTZ;
        ALTER TABLE marketplace_listings ADD COLUMN suspension_reason TEXT;

        COMMENT ON COLUMN marketplace_listings.status IS 'Listing status: active, reserved, completed, suspended, removed';
        COMMENT ON COLUMN marketplace_listings.suspended_at IS 'Timestamp when listing was suspended';
        COMMENT ON COLUMN marketplace_listings.suspension_reason IS 'Reason for suspension';
    END IF;
END $$;

-- Add status column to templates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'collection_templates' AND column_name = 'status'
    ) THEN
        ALTER TABLE collection_templates ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));
        ALTER TABLE collection_templates ADD COLUMN suspended_at TIMESTAMPTZ;
        ALTER TABLE collection_templates ADD COLUMN suspension_reason TEXT;

        COMMENT ON COLUMN collection_templates.status IS 'Template status: active, suspended, deleted';
        COMMENT ON COLUMN collection_templates.suspended_at IS 'Timestamp when template was suspended';
        COMMENT ON COLUMN collection_templates.suspension_reason IS 'Reason for suspension';
    END IF;
END $$;

-- FUNCTION 1: admin_list_marketplace_listings
-- Returns paginated marketplace listings for admin oversight
CREATE OR REPLACE FUNCTION admin_list_marketplace_listings(
    p_status TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    collection_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    seller_id UUID,
    seller_nickname TEXT,
    price DECIMAL,
    views_count INTEGER,
    transaction_count INTEGER,
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ml.id,
        ml.title,
        c.name AS collection_name,
        COALESCE(ml.status, 'active') AS status,
        ml.created_at,
        ml.seller_id,
        p.nickname AS seller_nickname,
        ml.price,
        COALESCE(ml.views_count, 0)::INTEGER AS views_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM marketplace_transactions mt
            WHERE mt.listing_id = ml.id
        ) AS transaction_count,
        ml.is_public
    FROM marketplace_listings ml
    JOIN profiles p ON ml.seller_id = p.id
    JOIN collections c ON ml.collection_id = c.id
    WHERE
        (p_status IS NULL OR COALESCE(ml.status, 'active') = p_status)
        AND (p_query IS NULL OR ml.title ILIKE '%' || p_query || '%')
    ORDER BY ml.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- FUNCTION 2: admin_update_listing_status
-- Updates the status of a marketplace listing
CREATE OR REPLACE FUNCTION admin_update_listing_status(
    p_listing_id BIGINT,
    p_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    -- Validate status
    IF p_status NOT IN ('active', 'suspended', 'removed') THEN
        RAISE EXCEPTION 'Invalid status. Must be: active, suspended, removed';
    END IF;

    -- Update listing
    UPDATE marketplace_listings
    SET
        status = p_status,
        suspended_at = CASE WHEN p_status = 'suspended' THEN NOW() ELSE NULL END,
        suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Log action to audit_log
    INSERT INTO audit_log (
        action_type,
        performed_by,
        target_type,
        target_id,
        metadata
    ) VALUES (
        'listing_' || p_status,
        auth.uid(),
        'marketplace_listing',
        p_listing_id,
        jsonb_build_object('reason', p_reason)
    );
END;
$$;

-- FUNCTION 3: admin_list_templates
-- Returns paginated templates for admin oversight
CREATE OR REPLACE FUNCTION admin_list_templates(
    p_status TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_nickname TEXT,
    rating_avg DECIMAL,
    rating_count BIGINT,
    copies_count INTEGER,
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        COALESCE(ct.status, 'active') AS status,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.rating_avg,
        ct.rating_count,
        ct.copies_count,
        ct.is_public
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE
        (p_status IS NULL OR COALESCE(ct.status, 'active') = p_status)
        AND (p_query IS NULL OR ct.title ILIKE '%' || p_query || '%')
    ORDER BY ct.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- FUNCTION 4: admin_update_template_status
-- Updates the status of a template
CREATE OR REPLACE FUNCTION admin_update_template_status(
    p_template_id BIGINT,
    p_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate admin permission
    PERFORM require_admin();

    -- Validate status
    IF p_status NOT IN ('active', 'suspended', 'deleted') THEN
        RAISE EXCEPTION 'Invalid status. Must be: active, suspended, deleted';
    END IF;

    -- Update template
    UPDATE collection_templates
    SET
        status = p_status,
        suspended_at = CASE WHEN p_status = 'suspended' THEN NOW() ELSE NULL END,
        suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END,
        is_public = CASE WHEN p_status IN ('suspended', 'deleted') THEN FALSE ELSE is_public END
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Log action to audit_log
    INSERT INTO audit_log (
        action_type,
        performed_by,
        target_type,
        target_id,
        metadata
    ) VALUES (
        'template_' || p_status,
        auth.uid(),
        'template',
        p_template_id,
        jsonb_build_object('reason', p_reason)
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_list_marketplace_listings TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_listing_status TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_templates TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_template_status TO authenticated;

-- Add comments
COMMENT ON FUNCTION admin_list_marketplace_listings IS 'Returns paginated marketplace listings for admin oversight';
COMMENT ON FUNCTION admin_update_listing_status IS 'Updates the status of a marketplace listing (admin only)';
COMMENT ON FUNCTION admin_list_templates IS 'Returns paginated templates for admin oversight';
COMMENT ON FUNCTION admin_update_template_status IS 'Updates the status of a template (admin only)';
