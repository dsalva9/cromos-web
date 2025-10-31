-- =====================================================
-- FIX: Add require_admin() helper function
-- =====================================================
-- Purpose: Create require_admin() function that admin RPC functions expect
-- Issue: Admin functions call require_admin() but only is_admin_user() exists
-- =====================================================

-- Create require_admin() helper function
-- This function raises an exception if the current user is not an admin
CREATE OR REPLACE FUNCTION require_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION require_admin() TO authenticated;

-- Add comment
COMMENT ON FUNCTION require_admin IS 'Raises an exception if the current user is not an admin. Used for access control in admin RPC functions.';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test as admin user:
-- SELECT require_admin(); -- Should succeed if user is admin
-- Test as regular user:
-- SELECT require_admin(); -- Should fail with "Access denied" error
