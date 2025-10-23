-- =====================================================
-- Get Template Details RPC
-- =====================================================
-- Purpose: Fetch detailed template information including pages and slots
-- =====================================================

CREATE OR REPLACE FUNCTION get_template_details(p_template_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template JSON;
    v_pages JSON;
BEGIN
    -- Get template info
    SELECT json_build_object(
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
        'updated_at', ct.updated_at
    )
    INTO v_template
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE ct.id = p_template_id;

    -- Check if template exists
    IF v_template IS NULL THEN
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
                        'label', ts.label,
                        'is_special', ts.is_special
                    )
                    ORDER BY ts.slot_number
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_template_details TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION get_template_details IS 'Gets detailed template information including pages and slots';
