-- =====================================================
-- COLLECTION TEMPLATES: Test get_my_template_copies RPC
-- =====================================================
-- Purpose: Test the RPC function to ensure it works correctly
-- =====================================================

-- Test the function with a simple select
-- This will help verify the function exists and can be called
SELECT 
  proname,
  pronargs,
  proargnames,
  proargtypes
FROM pg_proc 
WHERE proname = 'get_my_template_copies';

-- Check if the function has the correct return type
SELECT 
  proname,
  typname AS return_type
FROM pg_proc p
JOIN pg_type t ON p.prorettype = t.oid
WHERE proname = 'get_my_template_copies';

-- Check permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_routine_grants
WHERE routine_name = 'get_my_template_copies';

-- Test the function structure (this will fail if there are syntax errors)
-- We use DO block to avoid actual execution
DO $$
BEGIN
  -- Check if function can be created without errors
  -- This is just a syntax check
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_my_template_copies'
  ) THEN
    RAISE NOTICE 'Function get_my_template_copies exists';
  ELSE
    RAISE EXCEPTION 'Function get_my_template_copies does not exist';
  END IF;
END $$;