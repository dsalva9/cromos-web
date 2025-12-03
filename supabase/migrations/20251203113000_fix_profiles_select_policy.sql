-- =====================================================
-- Fix profiles SELECT policy to avoid recursion
-- =====================================================

-- The issue: is_user_suspended() calls profiles table, causing recursion
-- Solution: Use direct column check instead of function for profiles table

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (
  -- Users can always see their own profile
  id = auth.uid() 
  OR 
  -- Others can see non-suspended profiles
  (is_suspended = false OR is_suspended IS NULL)
);
