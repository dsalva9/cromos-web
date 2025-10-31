-- =====================================================
-- FIX: Collection Filter Function
-- =====================================================
-- Purpose: Fix postcodes table reference and updated_at column
-- =====================================================

-- Drop and recreate the function with correct table/column names
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

COMMENT ON FUNCTION list_trade_listings_with_collection_filter IS 'List active marketplace listings with optional collection filter. Prioritizes exact template matches over fuzzy text matches. Fixed to use postal_codes table and haversine_distance function.';
