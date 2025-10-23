-- Migration: Drop old BIGINT versions of favourite functions
-- This resolves function overloading conflicts after changing target_id to TEXT
-- Date: 2025-10-23
-- Sprint: 10 (Social UI)

BEGIN;

-- Drop old versions that use BIGINT for p_target_id
DROP FUNCTION IF EXISTS toggle_favourite(TEXT, BIGINT);
DROP FUNCTION IF EXISTS is_favourited(TEXT, BIGINT);
DROP FUNCTION IF EXISTS get_favourite_count(TEXT, BIGINT);

-- Verify the TEXT versions exist
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check toggle_favourite exists with TEXT parameters
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'toggle_favourite'
    AND pg_get_function_identity_arguments(p.oid) = 'p_target_type text, p_target_id text';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'toggle_favourite(TEXT, TEXT) not found!';
  END IF;

  RAISE NOTICE 'Cleanup successful! Old BIGINT functions removed, TEXT versions verified.';
END;
$$;

COMMIT;
