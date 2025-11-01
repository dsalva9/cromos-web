-- =====================================================
-- COLLECTION TEMPLATES: Update RPCs for slot variants
-- =====================================================
-- Purpose: Update RPC functions to support slot_variant and global_number
-- =====================================================

-- Update add_template_page_v2 to handle variants and global numbers
CREATE OR REPLACE FUNCTION add_template_page_v2(
    p_template_id BIGINT,
    p_title TEXT,
    p_type TEXT,
    p_slots JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_page_id BIGINT;
    v_page_number INTEGER;
    v_slots_count INTEGER;
    v_slot_record RECORD;
    v_slot_index INTEGER := 1;
    v_slots_json JSONB;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate type is allowed
    IF p_type NOT IN ('team', 'special') THEN
        RAISE EXCEPTION 'Type must be either team or special';
    END IF;

    -- Validate template belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = p_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template not found or you do not have permission';
    END IF;

    -- Handle different input types for p_slots
    IF p_slots IS NULL THEN
        RAISE EXCEPTION 'Slots cannot be null';
    END IF;

    -- If p_slots is already a JSONB array, use it directly
    IF jsonb_typeof(p_slots) = 'array' THEN
        v_slots_json := p_slots;
    -- If p_slots is a string, parse it as JSON
    ELSIF jsonb_typeof(p_slots) = 'string' THEN
        BEGIN
            v_slots_json := p_slots::text::jsonb;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid JSON in slots parameter';
        END;
    -- If p_slots is an object, wrap it in an array
    ELSIF jsonb_typeof(p_slots) IN ('object', 'null') THEN
        v_slots_json := jsonb_build_array(p_slots);
    ELSE
        RAISE EXCEPTION 'Invalid slots parameter type: %', jsonb_typeof(p_slots);
    END IF;

    -- Validate slots is not empty
    IF v_slots_json IS NULL OR jsonb_array_length(v_slots_json) = 0 THEN
        RAISE EXCEPTION 'Must provide at least one slot';
    END IF;

    -- Calculate next page number
    SELECT COALESCE(MAX(page_number), 0) + 1 INTO v_page_number
    FROM template_pages
    WHERE template_id = p_template_id;

    -- Calculate slots count
    v_slots_count := jsonb_array_length(v_slots_json);

    -- Insert the page
    INSERT INTO template_pages (
        template_id,
        page_number,
        title,
        type,
        slots_count
    ) VALUES (
        p_template_id,
        v_page_number,
        p_title,
        p_type,
        v_slots_count
    ) RETURNING id INTO v_page_id;

    -- Add slots to the page
    FOR v_slot_record IN
        SELECT * FROM jsonb_to_recordset(v_slots_json) AS x(
            label TEXT,
            is_special BOOLEAN,
            slot_variant TEXT,
            global_number INTEGER
        )
    LOOP
        INSERT INTO template_slots (
            page_id,
            slot_number,
            label,
            is_special,
            slot_variant,
            global_number
        ) VALUES (
            v_page_id,
            v_slot_index,
            v_slot_record.label,
            COALESCE(v_slot_record.is_special, FALSE),
            v_slot_record.slot_variant,
            v_slot_record.global_number
        );

        v_slot_index := v_slot_index + 1;
    END LOOP;

    RETURN v_page_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_template_page_v2 TO authenticated;

-- Update comment
COMMENT ON FUNCTION add_template_page_v2 IS 'Adds a page to a template with slots, supporting variants and global numbers (v2 with robust JSON handling)';

-- =====================================================
-- Update get_template_copy_slots to return variants
-- =====================================================

CREATE OR REPLACE FUNCTION get_template_copy_slots(p_copy_id BIGINT)
RETURNS TABLE (
    slot_id BIGINT,
    page_id BIGINT,
    page_number INTEGER,
    page_title TEXT,
    page_type TEXT,
    slot_number INTEGER,
    slot_variant TEXT,
    global_number INTEGER,
    label TEXT,
    is_special BOOLEAN,
    status TEXT,
    count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template copy not found or you do not have permission';
    END IF;

    RETURN QUERY
    SELECT
        ts.id AS slot_id,
        tp.id AS page_id,
        tp.page_number,
        tp.title AS page_title,
        tp.type AS page_type,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number,
        ts.label,
        ts.is_special,
        COALESCE(utp.status, 'missing') AS status,
        COALESCE(utp.count, 0) AS count
    FROM user_template_copies utc
    JOIN collection_templates ct ON ct.id = utc.template_id
    JOIN template_pages tp ON tp.template_id = ct.id
    JOIN template_slots ts ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id
        AND utp.copy_id = utc.id
        AND utp.user_id = auth.uid()
    WHERE utc.id = p_copy_id
    ORDER BY tp.page_number, ts.slot_number, ts.slot_variant NULLS FIRST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_template_copy_slots TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_template_copy_slots IS 'Gets all slots for a template copy with user progress, including variants and global numbers';

-- =====================================================
-- Create new RPC: get_slot_by_global_number
-- =====================================================
-- Purpose: Quick lookup of slot by global checklist number
-- Used for quick entry mode

CREATE OR REPLACE FUNCTION get_slot_by_global_number(
    p_copy_id BIGINT,
    p_global_number INTEGER
)
RETURNS TABLE (
    slot_id BIGINT,
    page_id BIGINT,
    page_number INTEGER,
    page_title TEXT,
    slot_number INTEGER,
    slot_variant TEXT,
    label TEXT,
    status TEXT,
    count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template copy not found or you do not have permission';
    END IF;

    RETURN QUERY
    SELECT
        ts.id AS slot_id,
        tp.id AS page_id,
        tp.page_number,
        tp.title AS page_title,
        ts.slot_number,
        ts.slot_variant,
        ts.label,
        COALESCE(utp.status, 'missing') AS status,
        COALESCE(utp.count, 0) AS count
    FROM user_template_copies utc
    JOIN collection_templates ct ON ct.id = utc.template_id
    JOIN template_pages tp ON tp.template_id = ct.id
    JOIN template_slots ts ON ts.page_id = tp.id
    LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id
        AND utp.copy_id = utc.id
        AND utp.user_id = auth.uid()
    WHERE utc.id = p_copy_id
        AND ts.global_number = p_global_number
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_slot_by_global_number TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_slot_by_global_number IS 'Finds a slot by its global checklist number within a template copy';
