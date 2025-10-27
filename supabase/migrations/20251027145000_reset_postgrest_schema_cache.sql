-- =====================================================
-- Force PostgREST to reload schema cache
-- =====================================================
-- This will force PostgREST to reload all function definitions
-- Run this and then wait 10 seconds before trying again
-- =====================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Also try updating the function to force a schema change timestamp
COMMENT ON FUNCTION public.create_template_rating IS 'Creates a rating for a template (reloaded cache)';
