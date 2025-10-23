-- =====================================================
-- Fix list_public_templates to include total_slots
-- =====================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS list_public_templates(integer,integer,text,text);

-- Recreate with total_slots column
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
    total_slots BIGINT,
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
        COALESCE(slot_counts.total_slots, 0) AS total_slots,
        ct.created_at
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(ts.id) AS total_slots
        FROM template_pages tp
        JOIN template_slots ts ON ts.page_id = tp.id
        GROUP BY tp.template_id
    ) slot_counts ON ct.id = slot_counts.template_id
    WHERE ct.is_public = TRUE
    AND (
        p_search IS NULL
        OR
        ct.title ILIKE '%' || p_search || '%'
        OR
        COALESCE(ct.description, '') ILIKE '%' || p_search || '%'
    )
    ORDER BY
        CASE p_sort_by
            WHEN 'recent' THEN ct.created_at
        END DESC,
        CASE p_sort_by
            WHEN 'rating' THEN ct.rating_avg
        END DESC,
        CASE p_sort_by
            WHEN 'popular' THEN ct.copies_count
        END DESC,
        CASE p_sort_by
            WHEN 'rating' THEN ct.rating_count
        END DESC,
        ct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_public_templates TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION list_public_templates IS 'Lists public templates with pagination, search, and sorting (includes total slots)';
