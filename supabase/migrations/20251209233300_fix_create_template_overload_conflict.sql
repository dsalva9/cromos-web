-- =====================================================
-- TEMPLATES: Fix create_template function overload conflict
-- =====================================================
-- Purpose: Remove references to non-existent 5-parameter create_template
-- The 5-parameter version with p_item_schema was never actually created
-- but migrations 20251203083428 and 20251203130000 reference it
-- This causes PostgREST ambiguity errors
-- =====================================================

-- First, drop ANY existing create_template functions to start clean
DROP FUNCTION IF EXISTS public.create_template(
    p_title TEXT,
    p_description TEXT,
    p_image_url TEXT,
    p_is_public BOOLEAN,
    p_item_schema JSONB
);

-- Recreate the ONLY version we need: the 4-parameter version
-- This ensures it exists with the correct signature
CREATE OR REPLACE FUNCTION public.create_template(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
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
    INSERT INTO public.collection_templates (
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_template(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_template(TEXT, TEXT, TEXT, BOOLEAN) IS 'Creates a new collection template (4-parameter version only)';
