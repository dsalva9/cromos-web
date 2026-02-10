-- Fix the collection filter to match by template_id instead of copy_id.
-- The previous implementation tried to match tl.copy_id = ANY(p_collection_ids),
-- but p_collection_ids contains the CURRENT user's copy IDs, which never match
-- other users' listing copy_ids. The fuzzy text fallback was too permissive (similarity > 0.3).
-- 
-- Fix: Look up template_ids from the user's selected copies, then match listings
-- whose copy_id belongs to a user_template_copies row with the same template_id.

CREATE OR REPLACE FUNCTION "public"."list_trade_listings_with_collection_filter"(
    "p_limit" integer DEFAULT 20,
    "p_offset" integer DEFAULT 0,
    "p_search" "text" DEFAULT NULL::"text",
    "p_viewer_postcode" "text" DEFAULT NULL::"text",
    "p_sort_by_distance" boolean DEFAULT false,
    "p_collection_ids" bigint[] DEFAULT NULL::bigint[]
)
RETURNS TABLE(
    "id" bigint,
    "user_id" "uuid",
    "author_nickname" "text",
    "author_avatar_url" "text",
    "author_postcode" "text",
    "title" "text",
    "description" "text",
    "sticker_number" "text",
    "collection_name" "text",
    "image_url" "text",
    "status" "text",
    "views_count" integer,
    "created_at" timestamp with time zone,
    "copy_id" bigint,
    "slot_id" bigint,
    "distance_km" numeric,
    "match_score" integer
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_template_ids BIGINT[];
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

    -- Get template IDs for the selected user copies
    -- This allows us to match listings from ANY user who has the same template
    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT utc.template_id)
        INTO v_template_ids
        FROM user_template_copies utc
        WHERE utc.id = ANY(p_collection_ids);
    END IF;

    -- Prepare search query if search text is provided
    IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
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
        -- Match score: 2 = listing belongs to same template, 0 = no filter active
        CASE
            WHEN v_template_ids IS NOT NULL AND EXISTS (
                SELECT 1 FROM user_template_copies utc2
                WHERE utc2.id = tl.copy_id
                AND utc2.template_id = ANY(v_template_ids)
            ) THEN 2
            WHEN p_collection_ids IS NULL THEN 0
            ELSE -1
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
        -- Search filter
        AND (
            p_search IS NULL
            OR (
                v_search_query IS NOT NULL 
                AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '') || ' ' || COALESCE(tl.description, '')) @@ v_search_query
            )
            OR (
                length(p_search) < 4 
                AND (
                    tl.title ILIKE '%' || p_search || '%'
                    OR tl.collection_name ILIKE '%' || p_search || '%'
                    OR tl.description ILIKE '%' || p_search || '%'
                )
            )
            OR (
                 tl.title ILIKE '%' || p_search || '%'
                 OR tl.collection_name ILIKE '%' || p_search || '%'
                 OR tl.description ILIKE '%' || p_search || '%'
            )
        )
        -- Collection filter: match by template_id via the listing's copy
        AND (
            p_collection_ids IS NULL
            OR EXISTS (
                SELECT 1 FROM user_template_copies utc2
                WHERE utc2.id = tl.copy_id
                AND utc2.template_id = ANY(v_template_ids)
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
