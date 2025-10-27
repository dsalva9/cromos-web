-- =====================================================
-- Final fix for create_template_rating
-- =====================================================
-- Explicitly qualify all table/column references
-- Drop with CASCADE to remove any dependencies
-- =====================================================

-- Drop function completely with CASCADE
DROP FUNCTION IF EXISTS public.create_template_rating(BIGINT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_template_rating CASCADE;

-- Recreate with fully qualified references
CREATE FUNCTION public.create_template_rating(
    p_template_id BIGINT,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_rating_id BIGINT;
    v_old_rating DECIMAL;
    v_old_count INTEGER;
    v_is_author BOOLEAN;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Check if user is the template author
    -- IMPORTANT: collection_templates uses author_id, NOT user_id
    SELECT (ct.author_id = auth.uid()) INTO v_is_author
    FROM public.collection_templates ct
    WHERE ct.id = p_template_id;

    IF v_is_author IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    IF v_is_author THEN
        RAISE EXCEPTION 'Users cannot rate their own templates';
    END IF;

    -- Get current aggregate rating
    SELECT ct.rating_avg, ct.rating_count INTO v_old_rating, v_old_count
    FROM public.collection_templates ct
    WHERE ct.id = p_template_id;

    -- Create the rating
    INSERT INTO public.template_ratings (
        user_id,
        template_id,
        rating,
        comment
    ) VALUES (
        auth.uid(),
        p_template_id,
        p_rating,
        p_comment
    ) RETURNING id INTO v_rating_id;

    -- Update aggregate rating
    UPDATE public.collection_templates
    SET
        rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + p_rating) / (v_old_count + 1),
        rating_count = v_old_count + 1
    WHERE id = p_template_id;

    RETURN v_rating_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_template_rating(BIGINT, INTEGER, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_template_rating IS 'Creates a rating for a template and updates its aggregate rating (uses collection_templates.author_id)';
