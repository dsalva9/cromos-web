-- Drop the old English index as we want to use Spanish for consistency
DROP INDEX IF EXISTS idx_listings_search;

-- Create a new Spanish index for Full Text Search on title and collection_name
CREATE INDEX IF NOT EXISTS idx_listings_search_spanish 
ON public.trade_listings 
USING gin (to_tsvector('spanish', title || ' ' || COALESCE(collection_name, '')));

-- Create a trigram index on title to support efficient ILIKE searches
-- Note: collection_name already has a trigram index (idx_listings_collection_name_trgm)
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm 
ON public.trade_listings 
USING gin (title gin_trgm_ops);

-- Update the search function to use a more flexible search strategy
-- combining Full Text Search (for stemmed matches) and ILIKE (for partial matches)
CREATE OR REPLACE FUNCTION public.list_trade_listings_with_collection_filter(
    p_limit integer DEFAULT 20, 
    p_offset integer DEFAULT 0, 
    p_search text DEFAULT NULL::text, 
    p_viewer_postcode text DEFAULT NULL::text, 
    p_sort_by_distance boolean DEFAULT false, 
    p_collection_ids bigint[] DEFAULT NULL::bigint[]
)
RETURNS TABLE(
    id bigint, 
    user_id uuid, 
    author_nickname text, 
    author_avatar_url text, 
    author_postcode text, 
    title text, 
    description text, 
    sticker_number text, 
    collection_name text, 
    image_url text, 
    status text, 
    views_count integer, 
    created_at timestamp with time zone, 
    copy_id bigint, 
    slot_id bigint, 
    distance_km numeric, 
    match_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_collection_titles TEXT[];
    v_search_query tsquery;
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

    -- Prepare search query if search text is provided
    IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
        -- Create a prefix match query: "Test Ite" -> "test:* & ite:*"
        -- We sanitize the input to remove special characters that could break to_tsquery syntax
        -- removing & | ! ( ) : * and replacing multiple spaces with single space
        
        SELECT to_tsquery('spanish', string_agg(token || ':*', ' & '))
        INTO v_search_query
        FROM unnest(string_to_array(trim(regexp_replace(regexp_replace(p_search, '[&|!():*]', '', 'g'), '\s+', ' ', 'g')), ' ')) as token;
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
            OR (
                v_search_query IS NOT NULL 
                AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '')) @@ v_search_query
            )
            OR (
                -- Fallback for short strings or cases where FTS prefixing isn't enough (e.g. middle of word)
                -- Only apply if search string is short to avoid performance hit on long strings
                length(p_search) < 4 
                AND (
                    tl.title ILIKE '%' || p_search || '%'
                    OR tl.collection_name ILIKE '%' || p_search || '%'
                )
            )
            OR (
                 -- Also allow simple ILIKE for slightly longer strings if FTS fails?
                 -- Let's just use ILIKE generally as the user wants "flexible".
                 -- The dataset is likely not huge yet.
                 tl.title ILIKE '%' || p_search || '%'
                 OR tl.collection_name ILIKE '%' || p_search || '%'
            )
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
$function$;
