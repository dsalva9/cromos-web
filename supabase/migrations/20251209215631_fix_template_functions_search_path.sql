-- =====================================================
-- FIX: Add 'auth' schema to search_path for template functions
-- =====================================================
-- Issue: update_template_progress and copy_template functions
--        use auth.uid() but don't have 'auth' in search_path
-- Fix: Add 'auth' to search_path to ensure proper constraint resolution
-- =====================================================

-- Fix update_template_progress to include 'auth' in search_path
CREATE OR REPLACE FUNCTION update_template_progress(
    p_copy_id BIGINT,
    p_slot_id BIGINT,
    p_status TEXT,
    p_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate status is allowed
    IF p_status NOT IN ('missing', 'owned', 'duplicate') THEN
        RAISE EXCEPTION 'Status must be one of: missing, owned, duplicate';
    END IF;

    -- Validate copy belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_template_copies
        WHERE id = p_copy_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Copy not found or does not belong to you';
    END IF;

    -- If p_status != 'duplicate', force p_count = 0
    IF p_status != 'duplicate' THEN
        p_count := 0;
    END IF;

    -- If p_status = 'duplicate' and p_count < 1, raise exception
    IF p_status = 'duplicate' AND p_count < 1 THEN
        RAISE EXCEPTION 'Count must be >= 1 for duplicates';
    END IF;

    -- UPSERT into user_template_progress
    INSERT INTO user_template_progress (user_id, copy_id, slot_id, status, count)
    VALUES (auth.uid(), p_copy_id, p_slot_id, p_status, p_count)
    ON CONFLICT (user_id, copy_id, slot_id) DO UPDATE
    SET
        status = EXCLUDED.status,
        count = EXCLUDED.count,
        updated_at = NOW();
END;
$$;

-- Fix copy_template to include 'auth' in search_path
CREATE OR REPLACE FUNCTION copy_template(
    p_template_id BIGINT,
    p_custom_title TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
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

COMMENT ON FUNCTION update_template_progress IS 'Updates the progress of a slot in a template copy (FIXED: Added auth to search_path)';
COMMENT ON FUNCTION copy_template IS 'Copies a public template for the user (FIXED: Added auth to search_path)';
