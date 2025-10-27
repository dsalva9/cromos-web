-- =====================================================
-- Fix notify_template_rating to use collection_templates.author_id
-- =====================================================
-- Purpose: Prevent "column user_id does not exist" errors when inserting
--          into template_ratings by correcting the trigger function.
-- =====================================================

-- Drop existing trigger and function to ensure clean redeploy
DROP TRIGGER IF EXISTS trigger_notify_template_rating ON public.template_ratings;
DROP FUNCTION IF EXISTS public.notify_template_rating() CASCADE;

-- Recreate trigger function with correct author lookup
CREATE FUNCTION public.notify_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_template_author UUID;
BEGIN
    -- collection_templates uses author_id, not user_id
    SELECT ct.author_id
    INTO v_template_author
    FROM public.collection_templates ct
    WHERE ct.id = NEW.template_id;

    -- If template not found, prevent silent failures
    IF v_template_author IS NULL THEN
        RAISE EXCEPTION 'Template % not found when creating rating notification', NEW.template_id;
    END IF;

    -- Do not notify when author rates their own template (should be prevented upstream)
    IF NEW.user_id = v_template_author THEN
        RETURN NEW;
    END IF;

    -- Create notification for the template author
    INSERT INTO public.notifications (
        user_id,
        kind,
        template_id,
        rating_id,
        actor_id,
        created_at,
        payload
    )
    VALUES (
        v_template_author,
        'template_rated',
        NEW.template_id,
        NEW.id,
        NEW.user_id,
        NOW(),
        jsonb_build_object(
            'rating_value', NEW.rating,
            'has_comment', NEW.comment IS NOT NULL
        )
    );

    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_notify_template_rating
    AFTER INSERT ON public.template_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_template_rating();

-- Update documentation comment
COMMENT ON FUNCTION public.notify_template_rating IS
    'Trigger function to notify template authors when they receive a rating (uses collection_templates.author_id).';
