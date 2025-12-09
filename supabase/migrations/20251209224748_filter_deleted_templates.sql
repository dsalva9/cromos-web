-- =====================================================
-- Filter deleted templates from public view
-- =====================================================
-- Hide deleted templates from non-admins
-- Show deleted_at badge for admins
-- =====================================================

-- Drop existing function since we're changing return type
DROP FUNCTION IF EXISTS list_public_templates(INTEGER, INTEGER, TEXT, TEXT);

-- Update list_public_templates to filter deleted templates for non-admins
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
    created_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin (fully qualify column names)
    v_is_admin := EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    );

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
        ct.created_at,
        ct.deleted_at
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
    WHERE ct.is_public = TRUE
    -- Hide deleted templates from non-admins
    AND (v_is_admin OR ct.deleted_at IS NULL)
    AND (
        p_search IS NULL
        OR
        (
            ct.title ILIKE '%' || p_search || '%' OR
            COALESCE(ct.description, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY
        -- Sort by timestamp for 'recent'
        CASE WHEN p_sort_by = 'recent' THEN ct.created_at END DESC NULLS LAST,
        -- Sort by rating for 'rating'
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_avg END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_count END DESC NULLS LAST,
        -- Sort by popularity for 'popular'
        CASE WHEN p_sort_by = 'popular' THEN ct.copies_count END DESC NULLS LAST,
        -- Default sort by created_at
        ct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Update get_template_details to filter deleted templates for non-admins
CREATE OR REPLACE FUNCTION get_template_details(p_template_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_template JSON;
    v_pages JSON;
    v_is_admin BOOLEAN;
    v_deleted_at TIMESTAMPTZ;
BEGIN
    -- Check if user is admin (fully qualify column names)
    v_is_admin := EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    );

    -- Get template info with deleted_at
    SELECT
        json_build_object(
            'id', ct.id,
            'author_id', ct.author_id,
            'author_nickname', p.nickname,
            'title', ct.title,
            'description', ct.description,
            'image_url', ct.image_url,
            'is_public', ct.is_public,
            'rating_avg', ct.rating_avg,
            'rating_count', ct.rating_count,
            'copies_count', ct.copies_count,
            'created_at', ct.created_at,
            'updated_at', ct.updated_at,
            'deleted_at', ct.deleted_at
        ),
        ct.deleted_at
    INTO v_template, v_deleted_at
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE ct.id = p_template_id;

    -- Check if template exists
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Hide deleted templates from non-admins
    IF NOT v_is_admin AND v_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Get pages with slots
    SELECT json_agg(
        json_build_object(
            'id', tp.id,
            'page_number', tp.page_number,
            'title', tp.title,
            'type', tp.type,
            'slots_count', tp.slots_count,
            'slots', (
                SELECT json_agg(
                    json_build_object(
                        'id', ts.id,
                        'slot_number', ts.slot_number,
                        'slot_variant', ts.slot_variant,
                        'global_number', ts.global_number,
                        'label', ts.label,
                        'is_special', ts.is_special
                    )
                    ORDER BY ts.slot_number, ts.slot_variant NULLS FIRST
                )
                FROM template_slots ts
                WHERE ts.page_id = tp.id
            )
        )
        ORDER BY tp.page_number
    )
    INTO v_pages
    FROM template_pages tp
    WHERE tp.template_id = p_template_id;

    -- Return combined result
    RETURN json_build_object(
        'template', v_template,
        'pages', COALESCE(v_pages, '[]'::json)
    );
END;
$$;

COMMENT ON FUNCTION list_public_templates IS 'Lists public templates (hides deleted from non-admins)';
COMMENT ON FUNCTION get_template_details IS 'Gets template details (hides deleted from non-admins)';
