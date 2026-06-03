-- Migration: Secure newsletter_eligible_profiles view
-- Drop existing view to allow changing security options
DROP VIEW IF EXISTS public.newsletter_eligible_profiles;

-- Create view with security_invoker = true
CREATE OR REPLACE VIEW public.newsletter_eligible_profiles 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.nickname,
    p.is_admin,
    u.email,
    u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.deleted_at IS NULL
  AND p.is_suspended = false
  AND u.email_confirmed_at IS NOT NULL
  AND (
      (u.last_sign_in_at IS NOT NULL AND u.last_sign_in_at >= NOW() - INTERVAL '2 months')
      OR (u.last_sign_in_at IS NULL AND u.created_at >= NOW() - INTERVAL '15 days')
  );

-- Revoke all permissions from PUBLIC, anon, and authenticated roles to ensure it is not exposed via REST API
REVOKE ALL ON public.newsletter_eligible_profiles FROM PUBLIC, anon, authenticated;

-- Explicitly grant SELECT permission to service_role so edge functions can query it
GRANT SELECT ON public.newsletter_eligible_profiles TO service_role;
