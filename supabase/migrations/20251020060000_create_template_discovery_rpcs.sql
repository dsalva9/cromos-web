-- =====================================================
-- COLLECTION TEMPLATES: Create discovery and copy RPCs
-- =====================================================
-- Purpose: Enable users to explore and copy templates
-- Functions: list_public_templates, copy_template, get_my_template_copies
-- =====================================================

-- FUNCTION 1: list_public_templates
-- Lists public templates with pagination, search, and sorting
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
            ILIKE(ct.title, '%' || p_search || '%') OR
            ILIKE(COALESCE(ct.description, ''), '%' || p_search || '%')
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

-- FUNCTION 2: copy_template
-- Copies a public template for the user
CREATE OR REPLACE FUNCTION copy_template(
    p_template_id BIGINT,
    p_custom_title TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_copy_id BIGINT;
    v_template_title TEXT;
    v_is_public BOOLEAN;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to copy a template';
    END IF;
    
    -- Validate template exists and is public
    SELECT is_public, title INTO v_is_public, v_template_title
    FROM collection_templates
    WHERE id = p_template_id;
    
    IF v_is_public IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    IF v_is_public = FALSE THEN
        RAISE EXCEPTION 'Template is not public';
    END IF;
    
    -- Verify user hasn't already copied this template
    IF EXISTS (
        SELECT 1 FROM user_template_copies 
        WHERE user_id = auth.uid() AND template_id = p_template_id
    ) THEN
        RAISE EXCEPTION 'You have already copied this template';
    END IF;
    
    -- If p_custom_title is NULL, use template's title
    IF p_custom_title IS NULL OR TRIM(p_custom_title) = '' THEN
        p_custom_title := v_template_title;
    END IF;
    
    -- Insert the copy
    INSERT INTO user_template_copies (
        user_id,
        template_id,
        title,
        is_active
    ) VALUES (
        auth.uid(),
        p_template_id,
        p_custom_title,
        FALSE
    ) RETURNING id INTO v_copy_id;
    
    -- Get all slots from the template
    INSERT INTO user_template_progress (user_id, copy_id, slot_id, status, count)
    SELECT 
        auth.uid(),
        v_copy_id,
        ts.id,
        'missing',
        0
    FROM template_slots ts 
    JOIN template_pages tp ON ts.page_id = tp.id 
    WHERE tp.template_id = p_template_id;
    
    -- Update copies count
    UPDATE collection_templates 
    SET copies_count = copies_count + 1 
    WHERE id = p_template_id;
    
    RETURN v_copy_id;
END;
$$;

-- FUNCTION 3: get_my_template_copies
-- Gets all template copies for the current user
CREATE OR REPLACE FUNCTION get_my_template_copies()
RETURNS TABLE (
    copy_id BIGINT,
    template_id BIGINT,
    title TEXT,
    is_active BOOLEAN,
    copied_at TIMESTAMPTZ,
    original_author_nickname TEXT,
    completed_slots BIGINT,
    total_slots BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        utc.id AS copy_id,
        utc.template_id,
        utc.title,
        utc.is_active,
        utc.copied_at,
        p.nickname AS original_author_nickname,
        COALESCE(progress_counts.completed_slots, 0) AS completed_slots,
        COALESCE(progress_counts.total_slots, 0) AS total_slots
    FROM user_template_copies utc
    JOIN collection_templates ct ON utc.template_id = ct.id
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT 
            copy_id,
            COUNT(*) FILTER (WHERE status IN ('owned', 'duplicate')) AS completed_slots,
            COUNT(*) AS total_slots
        FROM user_template_progress
        GROUP BY copy_id
    ) progress_counts ON utc.id = progress_counts.copy_id
    WHERE utc.user_id = auth.uid()
    ORDER BY utc.is_active DESC, utc.copied_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_public_templates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION copy_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_template_copies TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION list_public_templates IS 'Lists public templates with pagination, search, and sorting';
COMMENT ON FUNCTION copy_template IS 'Copies a public template for the user';
COMMENT ON FUNCTION get_my_template_copies IS 'Gets all template copies for the current user';