-- Migration: Change favourites.target_id from BIGINT to TEXT
-- This allows storing both numeric IDs (listings, templates) and UUIDs (users)
-- Date: 2025-10-23
-- Sprint: 10 (Social UI)
-- Note: No backup needed - table is empty

BEGIN;

-- Step 1: Drop dependent constraints and indexes
ALTER TABLE favourites DROP CONSTRAINT IF EXISTS favourites_user_id_target_type_target_id_key;
DROP INDEX IF EXISTS idx_favourites_target;
DROP INDEX IF EXISTS idx_favourites_listing;
DROP INDEX IF EXISTS idx_favourites_template;
DROP INDEX IF EXISTS idx_favourites_user_target;

-- Step 2: Change target_id column type from BIGINT to TEXT
ALTER TABLE favourites ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;

-- Step 3: Recreate unique constraint
ALTER TABLE favourites ADD CONSTRAINT favourites_user_id_target_type_target_id_key
  UNIQUE(user_id, target_type, target_id);

-- Step 4: Recreate indexes
CREATE INDEX idx_favourites_target ON favourites(target_type, target_id);
CREATE INDEX idx_favourites_listing ON favourites(target_type, target_id) WHERE target_type = 'listing';
CREATE INDEX idx_favourites_template ON favourites(target_type, target_id) WHERE target_type = 'template';
CREATE INDEX idx_favourites_user_target ON favourites(target_type, target_id) WHERE target_type = 'user';

-- Step 5: Update toggle_favourite RPC to accept TEXT
CREATE OR REPLACE FUNCTION toggle_favourite(
  p_target_type TEXT,
  p_target_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if favourite exists
  SELECT EXISTS(
    SELECT 1 FROM favourites
    WHERE user_id = v_user_id
      AND target_type = p_target_type
      AND target_id = p_target_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove favourite
    DELETE FROM favourites
    WHERE user_id = v_user_id
      AND target_type = p_target_type
      AND target_id = p_target_id;
    RETURN FALSE;
  ELSE
    -- Add favourite
    INSERT INTO favourites (user_id, target_type, target_id)
    VALUES (v_user_id, p_target_type, p_target_id);
    RETURN TRUE;
  END IF;
END;
$$;

-- Step 6: Update is_favourited RPC to accept TEXT
CREATE OR REPLACE FUNCTION is_favourited(
  p_target_type TEXT,
  p_target_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS(
    SELECT 1 FROM favourites
    WHERE user_id = v_user_id
      AND target_type = p_target_type
      AND target_id = p_target_id
  );
END;
$$;

-- Step 7: Update get_favourite_count RPC to accept TEXT
CREATE OR REPLACE FUNCTION get_favourite_count(
  p_target_type TEXT,
  p_target_id TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM favourites
    WHERE target_type = p_target_type
      AND target_id = p_target_id
  );
END;
$$;

-- Step 8: Update get_user_favourites RPC (already uses TEXT, just verify)
-- This RPC returns the user's favourites list
-- No changes needed, just included for completeness

-- Step 9: Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_favourite(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_favourited(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_favourite_count(TEXT, TEXT) TO anon, authenticated;

-- Step 10: Verify migration
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check that column type is now TEXT
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'favourites'
    AND column_name = 'target_id'
    AND data_type = 'text';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: target_id is not TEXT';
  END IF;

  RAISE NOTICE 'Migration successful! target_id is now TEXT';
END;
$$;

COMMIT;
