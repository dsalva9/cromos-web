-- Migration: Fix list_my_favorite_listings RPC
-- Fix column name from listing_type to is_group
-- Date: 2025-12-17

BEGIN;

-- Drop the existing function first
DROP FUNCTION IF EXISTS list_my_favorite_listings(INTEGER, INTEGER);

-- Update the RPC function with correct column names
CREATE OR REPLACE FUNCTION list_my_favorite_listings(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  listing_id TEXT,
  title TEXT,
  image_url TEXT,
  status TEXT,
  is_group BOOLEAN,
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
    tl.is_group,
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

COMMIT;
