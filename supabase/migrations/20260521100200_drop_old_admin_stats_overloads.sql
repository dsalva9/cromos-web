-- Drop old single-param overloads that conflict with the new (p_days, p_since) versions.
-- CREATE OR REPLACE created new overloads instead of replacing, causing ambiguity errors.
DROP FUNCTION IF EXISTS public.admin_get_new_users_summary(integer);
DROP FUNCTION IF EXISTS public.admin_get_messaging_activity_summary(integer);
DROP FUNCTION IF EXISTS public.admin_get_messaging_activity_by_country(integer);
DROP FUNCTION IF EXISTS public.admin_get_listing_status_stats(integer);
DROP FUNCTION IF EXISTS public.admin_get_new_listings_by_country(integer);
DROP FUNCTION IF EXISTS public.admin_get_user_distribution_by_postcode(text, integer);
