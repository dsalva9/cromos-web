-- =====================================================
-- COLLECTION TEMPLATES: Create add_template_page_v2 RPC
-- =====================================================
-- Purpose: Create a new version of add_template_page with proper JSON handling
-- =====================================================

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
            is_special BOOLEAN
        )
    LOOP
        INSERT INTO template_slots (
            page_id,
            slot_number,
            label,
            is_special
        ) VALUES (
            v_page_id,
            v_slot_index,
            v_slot_record.label,
            COALESCE(v_slot_record.is_special, FALSE)
        );
        
        v_slot_index := v_slot_index + 1;
    END LOOP;
    
    RETURN v_page_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_template_page_v2 TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION add_template_page_v2 IS 'Adds a page to a template with slots (v2 with robust JSON handling)';