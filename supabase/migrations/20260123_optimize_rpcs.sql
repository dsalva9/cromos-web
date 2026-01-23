-- Migration: Optimize RPCs for performance
-- Date: 2026-01-23

-- 1. Create Index for default marketplace sort
CREATE INDEX IF NOT EXISTS idx_trade_listings_status_created_at
ON public.trade_listings (status, created_at DESC);

-- 2. Optimize get_my_template_copies (Remove N+1 Subqueries)
CREATE OR REPLACE FUNCTION public.get_my_template_copies()
 RETURNS TABLE(copy_id bigint, template_id bigint, title text, image_url text, is_active boolean, copied_at timestamp with time zone, original_author_nickname text, original_author_id uuid, completed_slots bigint, total_slots bigint, completion_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Validate user
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    WITH user_progress AS (
        SELECT 
            utp.copy_id,
            COUNT(*) as completed_count
        FROM user_template_progress utp
        WHERE utp.user_id = v_user_id
          AND utp.status IN ('owned', 'duplicate')
        GROUP BY utp.copy_id
    ),
    template_stats AS (
        -- Calculate total slots per template efficiently
        -- This could be cached in a materialized view for scaling
        SELECT 
            tp.template_id,
            COUNT(*) as total_count
        FROM template_slots ts
        JOIN template_pages tp ON ts.page_id = tp.id
        GROUP BY tp.template_id
    )
    SELECT 
        utc.id::BIGINT,
        utc.template_id::BIGINT,
        utc.title::TEXT,
        ct.image_url::TEXT,
        utc.is_active::BOOLEAN,
        utc.copied_at::TIMESTAMPTZ,
        COALESCE(p.nickname, 'Unknown')::TEXT,
        p.id::UUID,
        COALESCE(up.completed_count, 0)::BIGINT AS completed_slots,
        COALESCE(ts.total_count, 0)::BIGINT AS total_slots,
        CASE 
            WHEN COALESCE(ts.total_count, 0) = 0 THEN 0.0
            ELSE ROUND(
                (COALESCE(up.completed_count, 0)::DECIMAL / ts.total_count::DECIMAL) * 100, 
                2
            )
        END::DECIMAL(5,2) AS completion_percentage
    FROM user_template_copies utc
    INNER JOIN collection_templates ct ON utc.template_id = ct.id
    INNER JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN user_progress up ON utc.id = up.copy_id
    LEFT JOIN template_stats ts ON utc.template_id = ts.template_id
    WHERE utc.user_id = v_user_id
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$function$;

-- 3. Optimize list_trade_listings_with_collection_filter (Fast Path for Default Load + Fix Missing Columns)
CREATE OR REPLACE FUNCTION public.list_trade_listings_with_collection_filter(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_viewer_postcode text DEFAULT NULL::text, p_sort_by_distance boolean DEFAULT false, p_collection_ids bigint[] DEFAULT NULL::bigint[])
 RETURNS TABLE(id bigint, user_id uuid, author_nickname text, author_avatar_url text, author_postcode text, author_is_suspended boolean, author_deleted_at timestamp with time zone, deleted_at timestamp with time zone, title text, description text, sticker_number text, collection_name text, image_url text, status text, views_count integer, created_at timestamp with time zone, copy_id bigint, slot_id bigint, distance_km numeric, match_score integer, is_group boolean, group_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_collection_titles TEXT[];
    v_search_query tsquery;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    v_viewer_id := auth.uid();

    IF v_viewer_id IS NOT NULL THEN
        SELECT profiles.is_admin INTO v_is_admin
        FROM profiles
        WHERE profiles.id = v_viewer_id;
    END IF;

    -- Pre-fetch coordinates if needed
    IF p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
        SELECT pc.lat, pc.lon
        INTO v_viewer_lat, v_viewer_lon
        FROM postal_codes pc
        WHERE pc.postcode = p_viewer_postcode
        LIMIT 1;
    END IF;

    -- Pre-fetch collection titles if needed
    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT utc.title)
        INTO v_collection_titles
        FROM user_template_copies utc
        WHERE utc.id = ANY(p_collection_ids);
    END IF;

    -- FAST PATH: Default Load (No search, no filters, no geo sort)
    IF p_search IS NULL AND (p_collection_ids IS NULL OR array_length(p_collection_ids, 1) = 0) AND NOT p_sort_by_distance THEN
         RETURN QUERY
         SELECT
            tl.id,
            tl.user_id,
            p.nickname as author_nickname,
            p.avatar_url as author_avatar_url,
            p.postcode as author_postcode,
            p.is_suspended as author_is_suspended,
            p.deleted_at as author_deleted_at,
            tl.deleted_at,
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
            NULL::numeric as distance_km,
            0 as match_score,
            tl.is_group,
            tl.group_count
        FROM trade_listings tl
        JOIN profiles p ON tl.user_id = p.id
        WHERE tl.deleted_at IS NULL
          AND tl.status = 'active'
          -- Exclude own listings if logged in
          AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)
          -- Ignore suspended users
          AND (p.is_suspended IS FALSE OR p.is_suspended IS NULL)
          -- Ignore soft-deleted authors
          AND (p.deleted_at IS NULL)
          -- Ignored users check (only if logged in)
          AND (
               v_viewer_id IS NULL 
               OR NOT EXISTS (
                   SELECT 1 FROM ignored_users iu
                   WHERE iu.user_id = v_viewer_id
                   AND iu.ignored_user_id = tl.user_id
               )
          )
        ORDER BY tl.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
        
        RETURN;
    END IF;

    -- SLOW PATH: Complex Search / Geo Sort
    IF p_search IS NOT NULL AND length(p_search) > 0 THEN
        v_search_query := websearch_to_tsquery('spanish', p_search);
    END IF;

    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        p.nickname as author_nickname,
        p.avatar_url as author_avatar_url,
        p.postcode as author_postcode,
        p.is_suspended as author_is_suspended,
        p.deleted_at as author_deleted_at,
        tl.deleted_at,
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
        -- Distance Calculation
        CASE
            WHEN p_sort_by_distance AND v_viewer_lat IS NOT NULL THEN
                COALESCE(
                    haversine_distance(
                        v_viewer_lat, v_viewer_lon,
                        (SELECT lat FROM postal_codes WHERE postcode = p.postcode LIMIT 1),
                        (SELECT lon FROM postal_codes WHERE postcode = p.postcode LIMIT 1)
                    ),
                    999999
                )
            ELSE NULL
        END::numeric AS distance_km,
        -- Match Score Calculation
        (
            CASE
                WHEN p_search IS NOT NULL AND v_search_query IS NOT NULL AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '')) @@ v_search_query THEN 10
                WHEN p_search IS NOT NULL AND (tl.title ILIKE '%' || p_search || '%' OR tl.collection_name ILIKE '%' || p_search || '%') THEN 5
                ELSE 0
            END
            -- Add more scoring logic here if needed
        )::integer AS match_score,
        tl.is_group,
        tl.group_count
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE
        tl.deleted_at IS NULL
        AND tl.status = 'active'
        AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)
        AND (p.is_suspended IS FALSE OR p.is_suspended IS NULL)
        AND (p.deleted_at IS NULL)
        AND (
             v_viewer_id IS NULL 
             OR NOT EXISTS (
                 SELECT 1 FROM ignored_users iu
                 WHERE iu.user_id = v_viewer_id
                 AND iu.ignored_user_id = tl.user_id
             )
        )
        AND (
            p_search IS NULL
            OR (
                v_search_query IS NOT NULL
                AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '')) @@ v_search_query
            )
            OR (
                 tl.title ILIKE '%' || p_search || '%'
                 OR tl.collection_name ILIKE '%' || p_search || '%'
            )
        )
        AND (
            p_collection_ids IS NULL
            OR tl.copy_id = ANY(p_collection_ids)
            OR (
                v_collection_titles IS NOT NULL
                AND tl.collection_name IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM unnest(v_collection_titles) AS ct
                    WHERE similarity(tl.collection_name, ct) > 0.3
                )
            )
        )
    ORDER BY
        match_score DESC,
        CASE WHEN p_sort_by_distance THEN 0 ELSE 1 END ASC,
        distance_km ASC NULLS LAST,
        tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
