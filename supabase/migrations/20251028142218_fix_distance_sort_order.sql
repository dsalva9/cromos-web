-- Fix distance sorting to show closest listings first
-- The previous version had issues with column alias references in ORDER BY

CREATE OR REPLACE FUNCTION list_trade_listings_with_distance(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_viewer_postcode TEXT DEFAULT NULL,
    p_sort_by_distance BOOLEAN DEFAULT FALSE
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
    distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
        CASE
            WHEN p_viewer_postcode IS NOT NULL
                AND p.postcode IS NOT NULL
                AND pc_viewer.lat IS NOT NULL
                AND pc_author.lat IS NOT NULL
            THEN
                ROUND(
                    haversine_distance(
                        pc_viewer.lat, pc_viewer.lon,
                        pc_author.lat, pc_author.lon
                    )::NUMERIC,
                    1
                )
            ELSE NULL
        END AS distance_km
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    LEFT JOIN postal_codes pc_viewer
        ON pc_viewer.postcode = p_viewer_postcode
    LEFT JOIN postal_codes pc_author
        ON pc_author.postcode = p.postcode
    WHERE tl.status = 'active'
    AND (
        p_search IS NULL
        OR
        (
            tl.title ILIKE '%' || p_search || '%' OR
            COALESCE(tl.collection_name, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY
        CASE
            WHEN p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
                -- When sorting by distance, push null distances to end
                CASE
                    WHEN (p_viewer_postcode IS NOT NULL
                        AND p.postcode IS NOT NULL
                        AND pc_viewer.lat IS NOT NULL
                        AND pc_author.lat IS NOT NULL)
                    THEN 0
                    ELSE 1
                END
            ELSE 0
        END ASC,
        CASE
            WHEN p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
                ROUND(
                    haversine_distance(
                        pc_viewer.lat, pc_viewer.lon,
                        pc_author.lat, pc_author.lon
                    )::NUMERIC,
                    1
                )
            ELSE NULL
        END ASC NULLS LAST,
        tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION list_trade_listings_with_distance IS 'Lists active marketplace listings with optional distance-based sorting (fixed sort order)';
