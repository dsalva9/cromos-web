-- =====================================================
-- Fix create_template_rating aggregates and backfill data
-- =====================================================
-- Purpose:
--   * Ensure aggregate math handles NULL rating averages/counts
--   * Backfill existing collection_templates rows from template_ratings
-- =====================================================

-- Drop existing functions to replace with corrected versions
DROP FUNCTION IF EXISTS public.create_template_rating(BIGINT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_template_rating(BIGINT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.delete_template_rating(BIGINT) CASCADE;

-- Recreate function with NULL-safe aggregate updates
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
    v_is_author BOOLEAN;
    v_new_rating_avg DECIMAL;
    v_new_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Check if user is the template author (collection_templates uses author_id)
    SELECT (ct.author_id = auth.uid()) INTO v_is_author
    FROM public.collection_templates ct
    WHERE ct.id = p_template_id;

    IF v_is_author IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    IF v_is_author THEN
        RAISE EXCEPTION 'Users cannot rate their own templates';
    END IF;

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

    -- Recalculate aggregates from source data to avoid drift
    SELECT
        COALESCE(AVG(tr.rating)::DECIMAL, 0),
        COUNT(tr.id)
    INTO v_new_rating_avg, v_new_count
    FROM public.template_ratings tr
    WHERE tr.template_id = p_template_id;

    UPDATE public.collection_templates
    SET
        rating_avg = COALESCE(v_new_rating_avg, 0),
        rating_count = COALESCE(v_new_count, 0)
    WHERE id = p_template_id;

    RETURN v_rating_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_template_rating(BIGINT, INTEGER, TEXT) TO authenticated;

-- Update documentation comment
COMMENT ON FUNCTION public.create_template_rating IS
    'Creates a rating for a template and updates its aggregate rating (NULL-safe aggregates, uses collection_templates.author_id).';

-- =====================================================
-- Recreate update_template_rating with consistent aggregate refresh
-- =====================================================

CREATE FUNCTION public.update_template_rating(
    p_rating_id BIGINT,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_template_id BIGINT;
    v_new_rating_avg DECIMAL;
    v_new_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Ensure rating belongs to current user and capture template id
    SELECT template_id
    INTO v_template_id
    FROM public.template_ratings
    WHERE id = p_rating_id
      AND user_id = auth.uid();

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to update it';
    END IF;

    -- Update rating value/comment
    UPDATE public.template_ratings
    SET rating = p_rating,
        comment = p_comment
    WHERE id = p_rating_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update rating';
    END IF;

    -- Refresh aggregates from source data
    SELECT
        COALESCE(AVG(tr.rating)::DECIMAL, 0),
        COUNT(tr.id)
    INTO v_new_rating_avg, v_new_count
    FROM public.template_ratings tr
    WHERE tr.template_id = v_template_id;

    UPDATE public.collection_templates
    SET
        rating_avg = COALESCE(v_new_rating_avg, 0),
        rating_count = COALESCE(v_new_count, 0)
    WHERE id = v_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_template_rating(BIGINT, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION public.update_template_rating IS
    'Updates a rating and refreshes aggregate metrics from template_ratings.';

-- =====================================================
-- Recreate delete_template_rating with consistent aggregate refresh
-- =====================================================

CREATE FUNCTION public.delete_template_rating(
    p_rating_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_template_id BIGINT;
    v_new_rating_avg DECIMAL;
    v_new_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Ensure rating belongs to current user and capture template id
    SELECT template_id
    INTO v_template_id
    FROM public.template_ratings
    WHERE id = p_rating_id
      AND user_id = auth.uid();

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to delete it';
    END IF;

    -- Delete rating
    DELETE FROM public.template_ratings
    WHERE id = p_rating_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to delete rating';
    END IF;

    -- Refresh aggregates from source data
    SELECT
        COALESCE(AVG(tr.rating)::DECIMAL, 0),
        COUNT(tr.id)
    INTO v_new_rating_avg, v_new_count
    FROM public.template_ratings tr
    WHERE tr.template_id = v_template_id;

    UPDATE public.collection_templates
    SET
        rating_avg = COALESCE(v_new_rating_avg, 0),
        rating_count = COALESCE(v_new_count, 0)
    WHERE id = v_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_template_rating(BIGINT) TO authenticated;

COMMENT ON FUNCTION public.delete_template_rating IS
    'Deletes a rating and refreshes aggregate metrics from template_ratings.';

-- =====================================================
-- Backfill existing aggregates using template_ratings data
-- =====================================================

-- Recompute aggregates for templates that already have ratings
WITH aggregates AS (
    SELECT
        tr.template_id,
        COALESCE(AVG(tr.rating)::DECIMAL, 0) AS avg_rating,
        COUNT(tr.id) AS rating_count
    FROM public.template_ratings tr
    GROUP BY tr.template_id
)
UPDATE public.collection_templates ct
SET
    rating_avg = agg.avg_rating,
    rating_count = agg.rating_count
FROM aggregates agg
WHERE ct.id = agg.template_id;

-- Ensure templates without ratings default to zeroed aggregates
UPDATE public.collection_templates
SET
    rating_avg = 0,
    rating_count = 0
WHERE rating_avg IS NULL
   OR rating_count IS NULL;
