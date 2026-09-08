-- Drop the 4-param overload of list_public_templates.
-- The 5-param version (with DEFAULT p_country_code = NULL) covers all call sites.
-- Having both created PostgREST ambiguity (PGRST203) when called without p_country_code.
DROP FUNCTION IF EXISTS public.list_public_templates(text, text, integer, integer);
