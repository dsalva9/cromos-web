-- Fix ILIKE syntax in list_public_templates function
CREATE OR REPLACE FUNCTION list_public_templates(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'recent'
)
RETURNS TABLE (
    id BIGINT,
    author_id UUID,
    author_nickname TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    rating_avg DECIMAL,
    rating_count INTEGER,
    copies_count INTEGER,
    pages_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.title,
        ct.description,
        ct.image_url,
        ct.rating_avg,
        ct.rating_count,
        ct.copies_count,
        COALESCE(page_counts.page_count, 0) AS pages_count,
        ct.created_at
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
    WHERE ct.is_public = TRUE
    AND (
        p_search IS NULL 
        OR 
        (
            ct.title ILIKE '%' || p_search || '%' OR
            COALESCE(ct.description, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY
        CASE
            WHEN p_sort_by = 'recent' THEN ct.created_at
            WHEN p_sort_by = 'rating' THEN ct.rating_avg
            WHEN p_sort_by = 'popular' THEN ct.copies_count
            ELSE ct.created_at
        END DESC,
        CASE
            WHEN p_sort_by = 'rating' THEN ct.rating_count
            ELSE 0
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_public_templates TO anon, authenticated;
