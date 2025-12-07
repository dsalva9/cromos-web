-- Fix broken RLS policy on profiles table
-- The policy was checking non-existent 'is_suspended' column
-- Need to use 'suspended_at' and 'deleted_at' instead

-- Drop the broken policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Recreate with correct column names
CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  (suspended_at IS NULL AND deleted_at IS NULL)
);
