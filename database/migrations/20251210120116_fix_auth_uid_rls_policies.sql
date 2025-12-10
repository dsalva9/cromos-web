-- =====================================================
-- Migration: Fix auth.uid() calls in RLS policies
-- Created: 2025-12-10
-- Description: Fixes performance issue where auth.uid() is re-evaluated for each row
-- =====================================================

-- =====================================================
-- ISSUE:
-- Supabase performance advisor detected that auth.uid() is being called
-- directly in RLS policies, causing it to be re-evaluated for each row.
-- This creates massive overhead and causes query timeouts.
--
-- SOLUTION:
-- Wrap auth.uid() calls with (select auth.uid()) to ensure it's only
-- evaluated once per query, not once per row.
-- =====================================================

-- =====================================================
-- FIX: Update "Authenticated users can view profiles" policy
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = (select auth.uid())
  OR
  (suspended_at IS NULL AND deleted_at IS NULL)
);

-- =====================================================
-- FIX: Update "Users can view own profile" policy
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (id = (select auth.uid()));

-- =====================================================
-- FIX: Update "Update own profile" policy
-- =====================================================

DROP POLICY IF EXISTS "Update own profile" ON profiles;

CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- FIX: Update "Enable delete for users based on user_id" policy
-- =====================================================

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON profiles;

CREATE POLICY "Enable delete for users based on user_id" ON profiles
  FOR DELETE
  TO authenticated
  USING (id = (select auth.uid()));

-- =====================================================
-- FIX: Update "Enable insert for authenticated users only" policy
-- =====================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

CREATE POLICY "Enable insert for authenticated users only" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- FIX: Update "Enable insert for users based on user_id" policy
-- =====================================================

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;

CREATE POLICY "Enable insert for users based on user_id" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After applying this migration, the query:
-- SELECT suspended_at, deleted_at FROM profiles WHERE id = auth.uid();
-- should complete in < 100ms without triggering the performance advisor warning.
-- =====================================================
