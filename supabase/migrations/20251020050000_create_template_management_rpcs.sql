-- =====================================================
-- COLLECTION TEMPLATES: Create template management RPCs
-- =====================================================
-- Purpose: Enable users to create and manage templates
-- Functions: create_template, add_template_page, publish_template
-- =====================================================

-- FUNCTION 1: create_template
-- Creates a new collection template
CREATE OR REPLACE FUNCTION create_template(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a template';
    END IF;
    
    -- Validate title is not empty
    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;
    
    -- Insert the template
    INSERT INTO collection_templates (
        author_id,
        title,
        description,
        image_url,
        is_public
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_image_url,
        p_is_public
    ) RETURNING id INTO v_template_id;
    
    RETURN v_template_id;
END;
$$;

-- FUNCTION 2: add_template_page
-- Adds a page to a template with slots
CREATE OR REPLACE FUNCTION add_template_page(
    p_template_id BIGINT,
    p_title TEXT,
    p_type TEXT,
    p_slots JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_page_id BIGINT;
    v_page_number INTEGER;
    v_slots_count INTEGER;
    v_slot_record RECORD;
    v_slot_index INTEGER := 1;
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
    
    -- Validate slots is not empty
    IF p_slots IS NULL OR jsonb_array_length(p_slots) = 0 THEN
        RAISE EXCEPTION 'Must provide at least one slot';
    END IF;
    
    -- Calculate next page number
    SELECT COALESCE(MAX(page_number), 0) + 1 INTO v_page_number
    FROM template_pages
    WHERE template_id = p_template_id;
    
    -- Calculate slots count
    v_slots_count := jsonb_array_length(p_slots);
    
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
        SELECT * FROM jsonb_to_recordset(p_slots) AS x(
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

-- FUNCTION 3: publish_template
-- Publishes or unpublishes a template
CREATE OR REPLACE FUNCTION publish_template(
    p_template_id BIGINT,
    p_is_public BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate template belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM collection_templates 
        WHERE id = p_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template not found or you do not have permission';
    END IF;
    
    -- Validate template has at least one page
    IF NOT EXISTS (
        SELECT 1 FROM template_pages 
        WHERE template_id = p_template_id
    ) THEN
        RAISE EXCEPTION 'Template must have at least one page before publishing';
    END IF;
    
    -- Update the template
    UPDATE collection_templates 
    SET is_public = p_is_public, updated_at = NOW()
    WHERE id = p_template_id;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update template';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_template TO authenticated;
GRANT EXECUTE ON FUNCTION add_template_page TO authenticated;
GRANT EXECUTE ON FUNCTION publish_template TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_template IS 'Creates a new collection template';
COMMENT ON FUNCTION add_template_page IS 'Adds a page to a template with slots';
COMMENT ON FUNCTION publish_template IS 'Publishes or unpublishes a template';