-- =====================================================
-- Migration: Fix Recursive RLS Policies on Profiles Table
-- Created: 2025-12-10
-- Description: Fixes query timeout issues caused by recursive RLS policy evaluation
-- =====================================================

-- =====================================================
-- ISSUE SUMMARY:
-- The profiles table had recursive RLS policies that called is_admin() function,
-- which in turn queried the profiles table again, creating an infinite loop.
-- This caused 5+ second query timeouts when checking suspension status.
-- =====================================================

-- =====================================================
-- FIX 1: Drop dependent policies first
-- =====================================================
-- Must drop policies that depend on is_admin() before we can modify the function

DROP POLICY IF EXISTS "Admins can view all users including deleted" ON profiles;

-- =====================================================
-- FIX 2: Optimize is_admin() to avoid recursion
-- =====================================================
-- Replace the is_admin() function to use a direct column check
-- with RLS bypassing to prevent recursion

-- Only drop the no-parameter version
DROP FUNCTION IF EXISTS is_admin();

-- Recreate both functions with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Bypass RLS by using security definer with a direct query
  -- This prevents recursive RLS evaluation
  SELECT COALESCE(
    (SELECT p.is_admin
     FROM profiles p
     WHERE p.id = auth.uid()
     LIMIT 1),
    false
  );
$$;

-- Also recreate the UUID version with SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS and prevent recursion
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND is_admin = true
  );
END;
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

COMMENT ON FUNCTION is_admin(UUID) IS
  'Returns true if specified user is admin. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- =====================================================
-- FIX 3: Recreate profiles RLS policy with better implementation
-- =====================================================
-- Create a new admin policy using the updated is_admin() function
CREATE POLICY "Admins can view all users including deleted" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- =====================================================
-- FIX 4: Optimize check_user_visibility function
-- =====================================================
-- Update to minimize recursive calls
-- Don't drop, just replace (used by many RLS policies)

CREATE OR REPLACE FUNCTION check_user_visibility(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_is_deleted BOOLEAN;
    v_is_suspended BOOLEAN;
    v_current_user_is_admin BOOLEAN;
BEGIN
    -- Check if target user is deleted or suspended
    SELECT
        deleted_at IS NOT NULL,
        suspended_at IS NOT NULL
    INTO v_is_deleted, v_is_suspended
    FROM profiles
    WHERE id = p_user_id;

    -- If user not found, not visible
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If user is active (not deleted and not suspended), always visible
    IF NOT v_is_deleted AND NOT v_is_suspended THEN
        RETURN TRUE;
    END IF;

    -- If user is deleted or suspended, check if viewer is admin
    -- Use a direct query with SECURITY DEFINER to bypass RLS
    SELECT COALESCE(p.is_admin, FALSE)
    INTO v_current_user_is_admin
    FROM profiles p
    WHERE p.id = auth.uid();

    RETURN v_current_user_is_admin;
END;
$$;

COMMENT ON FUNCTION check_user_visibility IS
    'Returns TRUE if user should be visible to current viewer. Uses SECURITY DEFINER to prevent RLS recursion.';

GRANT EXECUTE ON FUNCTION check_user_visibility TO authenticated, anon;

-- =====================================================
-- FIX 5: Add composite index for suspension checks
-- =====================================================
-- This optimizes the common query: WHERE id = X AND suspended_at IS NULL AND deleted_at IS NULL

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_profiles_active_status;

-- Create composite index for fast suspension/deletion checks
CREATE INDEX IF NOT EXISTS idx_profiles_active_status
  ON profiles(id, suspended_at, deleted_at)
  WHERE suspended_at IS NULL AND deleted_at IS NULL;

COMMENT ON INDEX idx_profiles_active_status IS
  'Optimizes queries checking if a user is active (not suspended or deleted)';

-- Also add an index specifically for the suspension check query pattern
CREATE INDEX IF NOT EXISTS idx_profiles_suspension_check
  ON profiles(id)
  INCLUDE (suspended_at, deleted_at);

COMMENT ON INDEX idx_profiles_suspension_check IS
  'Covering index for suspension status checks - includes suspended_at and deleted_at';

-- =====================================================
-- FIX 6: Analyze table to update statistics
-- =====================================================
-- This helps the query planner choose the best indexes

ANALYZE profiles;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- The following query should now be fast (< 100ms):
-- SELECT suspended_at, deleted_at FROM profiles WHERE id = auth.uid();
-- =====================================================
