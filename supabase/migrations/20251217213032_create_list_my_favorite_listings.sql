-- Migration: Create list_my_favorite_listings RPC
-- Returns the current user's favorited listings with full details
-- Date: 2025-12-17
-- Purpose: Support favorite listings feature in marketplace

BEGIN;

-- Create the RPC function
CREATE OR REPLACE FUNCTION list_my_favorite_listings(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  listing_id TEXT,
  title TEXT,
  image_url TEXT,
  status TEXT,
  listing_type TEXT,
  collection_name TEXT,
  author_nickname TEXT,
  author_avatar_url TEXT,
  author_id TEXT,
  created_at TIMESTAMPTZ,
  favorited_at TIMESTAMPTZ
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

  -- Return favorited listings with their details
  RETURN QUERY
  SELECT
    f.target_id AS listing_id,
    tl.title,
    tl.image_url,
    tl.status,
    tl.listing_type,
    tl.collection_name,
    p.nickname AS author_nickname,
    p.avatar_url AS author_avatar_url,
    tl.user_id AS author_id,
    tl.created_at,
    f.created_at AS favorited_at
  FROM favourites f
  JOIN trade_listings tl ON tl.id::TEXT = f.target_id
  JOIN profiles p ON p.id = tl.user_id
  WHERE f.user_id = v_user_id
    AND f.target_type = 'listing'
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION list_my_favorite_listings(INTEGER, INTEGER) TO authenticated;

-- Verify function exists
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'list_my_favorite_listings';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'list_my_favorite_listings function not created!';
  END IF;

  RAISE NOTICE 'Success! list_my_favorite_listings created and permissions granted.';
END;
$$;

COMMIT;
