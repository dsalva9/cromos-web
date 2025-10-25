-- =====================================================
-- TEMPLATES: Template editing and deletion functions
-- =====================================================
-- Purpose: Allow template authors to edit and delete their own templates
-- =====================================================

-- FUNCTION 1: update_template_metadata
-- Updates basic template metadata (only by author)
CREATE OR REPLACE FUNCTION update_template_metadata(
    p_template_id BIGINT,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT NULL
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

    -- Verify user is the template author
    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = p_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this template';
    END IF;

    -- Update only non-null fields
    UPDATE collection_templates
    SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url),
        is_public = COALESCE(p_is_public, is_public),
        updated_at = NOW()
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
END;
$$;

-- FUNCTION 2: update_template_page
-- Updates a single page in a template
CREATE OR REPLACE FUNCTION update_template_page(
    p_page_id BIGINT,
    p_title TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_page_number INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get template ID and verify ownership
    SELECT template_id INTO v_template_id
    FROM template_pages
    WHERE id = p_page_id;

    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this template';
    END IF;

    -- Update page
    UPDATE template_pages
    SET
        title = COALESCE(p_title, title),
        type = COALESCE(p_type, type),
        page_number = COALESCE(p_page_number, page_number)
    WHERE id = p_page_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Page not found';
    END IF;

    -- Update template updated_at
    UPDATE collection_templates
    SET updated_at = NOW()
    WHERE id = v_template_id;
END;
$$;

-- FUNCTION 3: delete_template_page
-- Deletes a page from a template
CREATE OR REPLACE FUNCTION delete_template_page(
    p_page_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get template ID and verify ownership
    SELECT template_id INTO v_template_id
    FROM template_pages
    WHERE id = p_page_id;

    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this template';
    END IF;

    -- Delete page (slots will be cascade deleted)
    DELETE FROM template_pages WHERE id = p_page_id;

    -- Update template updated_at
    UPDATE collection_templates
    SET updated_at = NOW()
    WHERE id = v_template_id;
END;
$$;

-- FUNCTION 4: update_template_slot
-- Updates a single slot in a template
CREATE OR REPLACE FUNCTION update_template_slot(
    p_slot_id BIGINT,
    p_label TEXT DEFAULT NULL,
    p_is_special BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get template ID and verify ownership
    SELECT tp.template_id INTO v_template_id
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    WHERE ts.id = p_slot_id;

    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this template';
    END IF;

    -- Update slot
    UPDATE template_slots
    SET
        label = COALESCE(p_label, label),
        is_special = COALESCE(p_is_special, is_special)
    WHERE id = p_slot_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot not found';
    END IF;

    -- Update template updated_at
    UPDATE collection_templates
    SET updated_at = NOW()
    WHERE id = v_template_id;
END;
$$;

-- FUNCTION 5: delete_template_slot
-- Deletes a slot from a template page
CREATE OR REPLACE FUNCTION delete_template_slot(
    p_slot_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get template ID and verify ownership
    SELECT tp.template_id INTO v_template_id
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    WHERE ts.id = p_slot_id;

    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = v_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this template';
    END IF;

    -- Delete slot
    DELETE FROM template_slots WHERE id = p_slot_id;

    -- Update template updated_at
    UPDATE collection_templates
    SET updated_at = NOW()
    WHERE id = v_template_id;
END;
$$;

-- FUNCTION 6: delete_template
-- Soft deletes a template (marks as not public and hidden)
CREATE OR REPLACE FUNCTION delete_template(
    p_template_id BIGINT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_copies_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Verify user is the template author
    IF NOT EXISTS (
        SELECT 1 FROM collection_templates
        WHERE id = p_template_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not have permission to delete this template';
    END IF;

    -- Check if template has copies
    SELECT copies_count INTO v_copies_count
    FROM collection_templates
    WHERE id = p_template_id;

    -- For now, we allow deletion even if copies exist
    -- Copies are independent and will remain functional

    -- Soft delete: mark as private and update title to indicate deletion
    UPDATE collection_templates
    SET
        is_public = FALSE,
        title = '[ELIMINADA] ' || title,
        updated_at = NOW()
    WHERE id = p_template_id;

    -- Log the deletion reason if provided (for future audit table)
    -- For now, we'll just use RAISE NOTICE
    IF p_reason IS NOT NULL THEN
        RAISE NOTICE 'Template % deleted by user % with reason: %',
            p_template_id, auth.uid(), p_reason;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_template_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION update_template_page TO authenticated;
GRANT EXECUTE ON FUNCTION delete_template_page TO authenticated;
GRANT EXECUTE ON FUNCTION update_template_slot TO authenticated;
GRANT EXECUTE ON FUNCTION delete_template_slot TO authenticated;
GRANT EXECUTE ON FUNCTION delete_template TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_template_metadata IS 'Updates basic template metadata (only by author)';
COMMENT ON FUNCTION update_template_page IS 'Updates a single page in a template';
COMMENT ON FUNCTION delete_template_page IS 'Deletes a page from a template';
COMMENT ON FUNCTION update_template_slot IS 'Updates a single slot in a template';
COMMENT ON FUNCTION delete_template_slot IS 'Deletes a slot from a template page';
COMMENT ON FUNCTION delete_template IS 'Soft deletes a template (marks as not public and hidden)';
