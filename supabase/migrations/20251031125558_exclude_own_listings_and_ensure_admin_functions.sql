-- =====================================================
-- FIX: Exclude User's Own Listings + Ensure Admin Functions
-- =====================================================
-- Purpose:
--   1. Update marketplace filter to exclude user's own listings
--   2. Ensure admin functions exist for dashboard
-- =====================================================

-- =====================================================
-- PART 1: Update marketplace filter to exclude own listings
-- =====================================================

DROP FUNCTION IF EXISTS list_trade_listings_with_collection_filter(INTEGER, INTEGER, TEXT, TEXT, BOOLEAN, BIGINT[]);

CREATE OR REPLACE FUNCTION list_trade_listings_with_collection_filter(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_viewer_postcode TEXT DEFAULT NULL,
    p_sort_by_distance BOOLEAN DEFAULT FALSE,
    p_collection_ids BIGINT[] DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    author_nickname TEXT,
    author_avatar_url TEXT,
    author_postcode TEXT,
    title TEXT,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    copy_id BIGINT,
    slot_id BIGINT,
    distance_km NUMERIC,
    match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_collection_titles TEXT[];
BEGIN
    v_viewer_id := auth.uid();

    -- Get viewer's coordinates if sorting by distance
    IF p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
        SELECT lat, lon
        INTO v_viewer_lat, v_viewer_lon
        FROM postal_codes
        WHERE postcode = p_viewer_postcode
        LIMIT 1;
    END IF;

    -- Get collection titles for fuzzy matching if collection filter is active
    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT utc.title)
        INTO v_collection_titles
        FROM user_template_copies utc
        WHERE utc.id = ANY(p_collection_ids);
    END IF;

    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar_url,
        p.postcode AS author_postcode,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        tl.copy_id,
        tl.slot_id,
        -- Calculate distance if coordinates available
        CASE
            WHEN v_viewer_lat IS NOT NULL AND v_viewer_lon IS NOT NULL AND pc.lat IS NOT NULL THEN
                ROUND(
                    haversine_distance(
                        v_viewer_lat, v_viewer_lon,
                        pc.lat, pc.lon
                    )::NUMERIC,
                    1
                )
            ELSE NULL
        END AS distance_km,
        -- Match score for prioritization: 2 = exact template match, 1 = fuzzy text match, 0 = no match
        CASE
            WHEN p_collection_ids IS NOT NULL AND tl.copy_id = ANY(p_collection_ids) THEN 2
            WHEN v_collection_titles IS NOT NULL AND tl.collection_name IS NOT NULL
                 AND EXISTS (
                     SELECT 1 FROM unnest(v_collection_titles) AS collection_title
                     WHERE similarity(tl.collection_name, collection_title) > 0.3
                 ) THEN 1
            WHEN p_collection_ids IS NULL THEN 0
            ELSE -1  -- Filtered out
        END AS match_score
    FROM trade_listings tl
    INNER JOIN profiles p ON p.id = tl.user_id
    LEFT JOIN postal_codes pc ON pc.postcode = p.postcode
    WHERE
        tl.status = 'active'
        -- Exclude user's own listings
        AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)
        -- Exclude ignored users
        AND (v_viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM ignored_users iu
            WHERE iu.user_id = v_viewer_id
            AND iu.ignored_user_id = tl.user_id
        ))
        -- Search filter (if provided)
        AND (
            p_search IS NULL
            OR to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, ''))
               @@ plainto_tsquery('spanish', p_search)
        )
        -- Collection filter: Only show matches if filter is active
        AND (
            p_collection_ids IS NULL  -- No filter active, show all
            OR tl.copy_id = ANY(p_collection_ids)  -- Exact template match
            OR (
                v_collection_titles IS NOT NULL
                AND tl.collection_name IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM unnest(v_collection_titles) AS collection_title
                    WHERE similarity(tl.collection_name, collection_title) > 0.3
                )
            )
        )
    ORDER BY
        -- First priority: match score (exact matches first)
        match_score DESC,
        -- Second priority: distance (if sorting enabled)
        CASE WHEN p_sort_by_distance THEN 0 ELSE 1 END ASC,
        CASE
            WHEN p_sort_by_distance AND v_viewer_lat IS NOT NULL THEN
                COALESCE(
                    haversine_distance(
                        v_viewer_lat, v_viewer_lon,
                        pc.lat, pc.lon
                    ),
                    999999
                )
            ELSE 999999
        END ASC NULLS LAST,
        -- Final priority: creation date
        tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION list_trade_listings_with_collection_filter(INTEGER, INTEGER, TEXT, TEXT, BOOLEAN, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION list_trade_listings_with_collection_filter(INTEGER, INTEGER, TEXT, TEXT, BOOLEAN, BIGINT[]) TO anon;

COMMENT ON FUNCTION list_trade_listings_with_collection_filter IS 'List active marketplace listings with optional collection filter. Excludes user''s own listings. Prioritizes exact template matches over fuzzy text matches.';

-- =====================================================
-- PART 2: Ensure admin functions exist
-- =====================================================
-- These functions may already exist from previous migration,
-- but we ensure they're present for admin dashboard
-- =====================================================

-- Ensure trade_listings has admin columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trade_listings' AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE trade_listings ADD COLUMN suspended_at TIMESTAMPTZ;
        COMMENT ON COLUMN trade_listings.suspended_at IS 'Timestamp when listing was suspended';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trade_listings' AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE trade_listings ADD COLUMN suspension_reason TEXT;
        COMMENT ON COLUMN trade_listings.suspension_reason IS 'Reason for suspension';
    END IF;
END $$;

-- Ensure collection_templates has admin columns
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

-- FUNCTION: admin_list_marketplace_listings
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
    views_count INTEGER,
    transaction_count INTEGER
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
        tl.id,
        tl.title,
        tl.collection_name,
        COALESCE(tl.status, 'active') AS status,
        tl.created_at,
        tl.user_id AS seller_id,
        p.nickname AS seller_nickname,
        COALESCE(tl.views_count, 0)::INTEGER AS views_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM listing_transactions lt
            WHERE lt.listing_id = tl.id
        ) AS transaction_count
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE
        (p_status IS NULL OR COALESCE(tl.status, 'active') = p_status)
        AND (p_query IS NULL OR tl.title ILIKE '%' || p_query || '%')
    ORDER BY tl.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- FUNCTION: admin_update_listing_status
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
    IF p_status NOT IN ('active', 'suspended', 'removed', 'sold', 'reserved', 'completed') THEN
        RAISE EXCEPTION 'Invalid status. Must be: active, suspended, removed, sold, reserved, completed';
    END IF;

    -- Update listing
    UPDATE trade_listings
    SET
        status = p_status,
        suspended_at = CASE WHEN p_status = 'suspended' THEN NOW() ELSE NULL END,
        suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Log action to audit_log if audit_log table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        INSERT INTO audit_log (
            action_type,
            performed_by,
            target_type,
            target_id,
            metadata
        ) VALUES (
            'listing_' || p_status,
            auth.uid(),
            'trade_listing',
            p_listing_id,
            jsonb_build_object('reason', p_reason)
        );
    END IF;
END;
$$;

-- FUNCTION: admin_list_templates
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

-- FUNCTION: admin_update_template_status
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

    -- Log action to audit_log if audit_log table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
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
    END IF;
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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test 1: Verify user's own listings are excluded from marketplace
-- SELECT id, title, user_id FROM list_trade_listings_with_collection_filter(20, 0, NULL, NULL, FALSE, NULL);
-- (Should not show listings where user_id = auth.uid())

-- Test 2: Verify admin functions exist
-- SELECT * FROM admin_list_marketplace_listings();
-- SELECT * FROM admin_list_templates();
