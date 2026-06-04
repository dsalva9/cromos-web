-- Migration: Fix public.is_admin_user() to support service_role and postgres roles
-- This ensures that cron jobs calling admin stats edge functions with service_role key
-- and direct DB superuser connections (e.g. postgres) bypass the admin check.

CREATE OR REPLACE FUNCTION public.is_admin_user() 
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN 
    (current_user = 'postgres') OR
    (auth.role() = 'service_role') OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    );
END;
$$;
