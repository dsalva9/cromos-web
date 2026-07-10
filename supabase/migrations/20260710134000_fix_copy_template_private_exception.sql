-- Migration: Fix copy_template for private templates by author
-- Allows the creator of a template to copy it, even if it is not public.

CREATE OR REPLACE FUNCTION public.copy_template(p_template_id bigint, p_custom_title text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_copy_id BIGINT;
    v_template_title TEXT;
    v_is_public BOOLEAN;
    v_author_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to copy a template';
    END IF;

    -- Validate template exists, is public, or is owned by the copying user
    SELECT is_public, title, author_id INTO v_is_public, v_template_title, v_author_id
    FROM collection_templates
    WHERE id = p_template_id;

    IF v_is_public IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Only raise exception if it's not public AND the current user is not the author
    IF v_is_public = FALSE AND v_author_id <> auth.uid() THEN
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
