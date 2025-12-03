-- Fix SECURITY DEFINER views by setting security_invoker = true
-- By default, all views in PostgreSQL are SECURITY DEFINER (run with creator's privileges)
-- Setting security_invoker = true makes views run with invoker's privileges and respect RLS
-- This is the recommended approach for Postgres 15+ per Supabase security guidelines

-- Drop and recreate moderation_audit_logs view with security_invoker
DROP VIEW IF EXISTS public.moderation_audit_logs;

CREATE VIEW public.moderation_audit_logs
WITH (security_invoker = true)
AS
SELECT
  id,
  admin_id,
  admin_nickname,
  entity_type,
  entity_id,
  action,
  old_values,
  new_values,
  moderation_action_type,
  moderated_entity_type,
  moderated_entity_id,
  moderation_reason,
  created_at
FROM audit_log
WHERE moderation_action_type IS NOT NULL
ORDER BY created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.moderation_audit_logs TO authenticated;

-- Note: With security_invoker=true, this view respects the underlying audit_log table's RLS policies
-- Only admins can query audit_log, so only admins can query this view

-- Drop and recreate listings_with_template_info view with security_invoker
DROP VIEW IF EXISTS public.listings_with_template_info;

CREATE VIEW public.listings_with_template_info
WITH (security_invoker = true)
AS
SELECT
  tl.id,
  tl.user_id,
  tl.title,
  tl.description,
  tl.sticker_number,
  tl.collection_name,
  tl.image_url,
  tl.status,
  tl.views_count,
  tl.created_at,
  tl.updated_at,
  utc.id AS copy_id,
  utc.title AS copy_title,
  ct.title AS template_title,
  ct.author_id AS template_author_id,
  p.nickname AS template_author_nickname,
  ts.page_id,
  template_pages.page_number,
  ts.slot_number,
  ts.label AS slot_label,
  utp.status AS slot_status,
  utp.count AS slot_count
FROM trade_listings tl
LEFT JOIN user_template_copies utc ON tl.copy_id = utc.id
LEFT JOIN collection_templates ct ON utc.template_id = ct.id
LEFT JOIN profiles p ON ct.author_id = p.id
LEFT JOIN template_slots ts ON tl.slot_id = ts.id
LEFT JOIN template_pages ON ts.page_id = template_pages.id
LEFT JOIN user_template_progress utp ON utp.copy_id = tl.copy_id
  AND utp.slot_id = tl.slot_id
  AND utp.user_id = tl.user_id;

-- Grant access to authenticated and anonymous users
GRANT SELECT ON public.listings_with_template_info TO authenticated;
GRANT SELECT ON public.listings_with_template_info TO anon;

-- Note: With security_invoker=true, this view respects RLS policies on underlying tables
-- Users will only see rows they have permission to access via RLS

COMMENT ON VIEW public.moderation_audit_logs IS 'Filtered view of audit log showing only moderation actions. Runs with invoker privileges to respect RLS.';
COMMENT ON VIEW public.listings_with_template_info IS 'Enriched listing data with template information. Runs with invoker privileges to respect RLS.';
