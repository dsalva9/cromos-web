-- =====================================================
-- Debug: Show all create_template_rating functions
-- =====================================================
-- Run this to see all versions of the function
-- =====================================================

SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_template_rating';
