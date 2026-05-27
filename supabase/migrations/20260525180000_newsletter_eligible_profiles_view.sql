-- Migration: Create newsletter_eligible_profiles view
-- Filters out users who haven't logged in for 2 months or signed up recently and never logged in.

CREATE OR REPLACE VIEW public.newsletter_eligible_profiles AS
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

-- Grant select to service_role
GRANT SELECT ON public.newsletter_eligible_profiles TO service_role;
