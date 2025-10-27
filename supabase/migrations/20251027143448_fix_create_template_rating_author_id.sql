-- =====================================================
-- Fix create_template_rating to use author_id instead of user_id
-- =====================================================
-- Purpose: Fix "column user_id does not exist" error
-- The collection_templates table uses author_id, not user_id
-- =====================================================

CREATE OR REPLACE FUNCTION create_template_rating(
    p_template_id BIGINT,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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

    -- Check if user is the template author (use author_id, not user_id)
    SELECT (author_id = auth.uid()) INTO v_is_author
    FROM collection_templates
    WHERE id = p_template_id;

    IF v_is_author THEN
        RAISE EXCEPTION 'Users cannot rate their own templates';
    END IF;

    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating, v_old_count
    FROM collection_templates
    WHERE id = p_template_id;

    -- Create the rating
    INSERT INTO template_ratings (
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
    UPDATE collection_templates
    SET
        rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + p_rating) / (v_old_count + 1),
        rating_count = v_old_count + 1
    WHERE id = p_template_id;

    RETURN v_rating_id;
END;
$$;

COMMENT ON FUNCTION create_template_rating IS 'Creates a rating for a template and updates its aggregate rating (fixed to use author_id)';
