-- =====================================================
-- MARKETPLACE COLLECTION FILTER SYSTEM
-- =====================================================
-- Purpose: Enable filtering marketplace by user's collections
-- Features:
--   1. Get user's template copies for filter UI
--   2. Enhanced listing filter with collection matching
--   3. Hybrid matching: exact template match + fuzzy text match
-- =====================================================

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- FUNCTION 1: Get User's Collections
-- =====================================================
-- Returns all template copies owned by a user
-- Used for populating collection filter dropdown
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_collections(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  copy_id BIGINT,
  template_id BIGINT,
  title TEXT,
  is_active BOOLEAN,
  copied_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use authenticated user if no user_id provided
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Check authentication
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    utc.id AS copy_id,
    utc.template_id,
    utc.title,
    utc.is_active,
    utc.copied_at
  FROM user_template_copies utc
  WHERE utc.user_id = p_user_id
  ORDER BY utc.copied_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_collections(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_collections IS 'Returns user''s template copies for collection filtering';

-- =====================================================
-- FUNCTION 2: Enhanced Listing Filter with Collections
-- =====================================================
-- Extends existing listing filter with collection matching
-- Prioritizes exact template matches, then fuzzy text matches
-- =====================================================

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

COMMENT ON FUNCTION list_trade_listings_with_collection_filter IS 'List active marketplace listings with optional collection filter. Prioritizes exact template matches over fuzzy text matches.';

-- =====================================================
-- FUNCTION 3: Get Template Slots for Auto-Populate
-- =====================================================
-- Returns slots for a specific template copy
-- Used when user selects collection in listing form
-- =====================================================

CREATE OR REPLACE FUNCTION get_template_copy_slots(p_copy_id BIGINT)
RETURNS TABLE (
    slot_id BIGINT,
    page_title TEXT,
    page_number INTEGER,
    slot_number INTEGER,
    slot_label TEXT,
    is_special BOOLEAN,
    user_status TEXT,
    user_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_template_id BIGINT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify user owns this copy
    SELECT template_id INTO v_template_id
    FROM user_template_copies
    WHERE id = p_copy_id AND user_id = v_user_id;

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Template copy not found or access denied';
    END IF;

    RETURN QUERY
    SELECT
        ts.id AS slot_id,
        tp.title AS page_title,
        tp.page_number,
        ts.slot_number,
        ts.label AS slot_label,
        ts.is_special,
        COALESCE(utp.status, 'missing') AS user_status,
        COALESCE(utp.count, 0) AS user_count
    FROM template_slots ts
    INNER JOIN template_pages tp ON tp.id = ts.page_id
    LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id
        AND utp.copy_id = p_copy_id
        AND utp.user_id = v_user_id
    WHERE tp.template_id = v_template_id
    ORDER BY tp.page_number ASC, ts.slot_number ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_template_copy_slots(BIGINT) TO authenticated;

COMMENT ON FUNCTION get_template_copy_slots IS 'Returns all slots for a template copy with user progress data. Used for slot selection in listing form.';

-- =====================================================
-- INDEX OPTIMIZATION
-- =====================================================
-- Add index for collection_name fuzzy matching

CREATE INDEX IF NOT EXISTS idx_listings_collection_name_trgm
ON trade_listings
USING gin (collection_name gin_trgm_ops)
WHERE collection_name IS NOT NULL AND status = 'active';

-- =====================================================
-- VERIFICATION QUERIES (For testing in Supabase dashboard)
-- =====================================================

-- Test 1: Get user's collections
-- SELECT * FROM get_user_collections();

-- Test 2: List all active listings (no filter)
-- SELECT id, title, collection_name, match_score
-- FROM list_trade_listings_with_collection_filter(20, 0, NULL, NULL, FALSE, NULL);

-- Test 3: Filter by specific collections (replace {1,2} with actual copy_ids)
-- SELECT id, title, collection_name, copy_id, match_score
-- FROM list_trade_listings_with_collection_filter(20, 0, NULL, NULL, FALSE, ARRAY[1,2]::BIGINT[])
-- ORDER BY match_score DESC;

-- Test 4: Get slots for a template copy (replace 1 with actual copy_id)
-- SELECT * FROM get_template_copy_slots(1);
