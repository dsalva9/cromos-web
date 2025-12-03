-- =====================================================
-- Fix profiles SELECT policy for authenticated users
-- =====================================================

-- The issue: The SELECT policy was only for 'public' role
-- Authenticated users need their own SELECT policy

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Policy for public (unauthenticated) users
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT 
TO public
USING (
  (is_suspended = false OR is_suspended IS NULL)
);

-- Policy for authenticated users
CREATE POLICY "Authenticated users can view profiles" ON profiles
FOR SELECT 
TO authenticated
USING (
  -- Users can always see their own profile
  id = auth.uid() 
  OR 
  -- Others can see non-suspended profiles
  (is_suspended = false OR is_suspended IS NULL)
);
