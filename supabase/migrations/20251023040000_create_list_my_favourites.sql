-- Migration: Create list_my_favourites RPC
-- Returns the current user's favorited users with their stats
-- Date: 2025-10-23
-- Sprint: 10 (Social UI)

BEGIN;

-- Drop if exists to ensure clean recreation
DROP FUNCTION IF EXISTS list_my_favourites(INTEGER, INTEGER);

-- Create the RPC function
CREATE OR REPLACE FUNCTION list_my_favourites(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  favorite_user_id TEXT,
  nickname TEXT,
  avatar_url TEXT,
  active_listings_count BIGINT,
  rating_avg DECIMAL(3,2),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return favorited users with their stats
  RETURN QUERY
  SELECT
    f.target_id AS favorite_user_id,
    p.nickname,
    p.avatar_url,
    COALESCE(listing_counts.count, 0) AS active_listings_count,
    p.rating_avg,
    f.created_at
  FROM favourites f
  JOIN profiles p ON p.id::TEXT = f.target_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM trade_listings
    WHERE status = 'active'
    GROUP BY user_id
  ) listing_counts ON listing_counts.user_id::TEXT = f.target_id
  WHERE f.user_id = v_user_id
    AND f.target_type = 'user'
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION list_my_favourites(INTEGER, INTEGER) TO authenticated;

-- Verify function exists
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'list_my_favourites';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'list_my_favourites function not created!';
  END IF;

  RAISE NOTICE 'Success! list_my_favourites created and permissions granted.';
END;
$$;

COMMIT;
