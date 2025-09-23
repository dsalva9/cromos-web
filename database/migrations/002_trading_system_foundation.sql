-- =====================================================
-- CROMOS TRADING SYSTEM DATABASE MIGRATION
-- Phase 2: RPC-Based Trading Foundation
-- Execute these commands in your Supabase SQL Editor
-- =====================================================

-- STEP 1: CREATE PERFORMANCE INDEXES
-- Execute these first during low traffic to avoid blocking

-- Index for efficient user_stickers trading queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stickers_trading 
ON user_stickers (sticker_id, user_id, wanted, count);

-- Index for stickers filtering by collection and properties  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_collection_filters 
ON stickers (collection_id, rarity, team_id, player_name);

-- Index for collection_teams name filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_teams_name 
ON collection_teams (team_name);

-- Index for efficient user lookups in profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_nickname 
ON profiles (nickname) WHERE nickname IS NOT NULL;

-- STEP 2: CREATE TRADING RPC FUNCTIONS
-- These are SECURITY DEFINER functions for controlled data access

-- =====================================================
-- FIND MUTUAL TRADERS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION find_mutual_traders(
  p_user_id UUID,
  p_collection_id INTEGER,
  p_rarity TEXT DEFAULT NULL,
  p_team TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_min_overlap INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  match_user_id UUID,
  nickname TEXT,
  overlap_from_them_to_me INTEGER,
  overlap_from_me_to_them INTEGER,
  total_mutual_overlap INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Stickers I want (wanted=true, count=0)
  my_wants AS (
    SELECT s.id, s.rarity, s.player_name, s.team_id
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
    LEFT JOIN collection_teams ct ON ct.id = s.team_id
    WHERE us.user_id = p_user_id
      AND s.collection_id = p_collection_id
      AND us.wanted = true
      AND us.count = 0
      AND (p_rarity IS NULL OR s.rarity = p_rarity)
      AND (p_team IS NULL OR ct.team_name ILIKE '%' || p_team || '%')
      AND (p_query IS NULL OR s.player_name ILIKE '%' || p_query || '%')
  ),
  -- Stickers I have (count > 0)
  my_have AS (
    SELECT s.id, s.rarity, s.player_name, s.team_id
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
    LEFT JOIN collection_teams ct ON ct.id = s.team_id
    WHERE us.user_id = p_user_id
      AND s.collection_id = p_collection_id
      AND us.count > 0
      AND (p_rarity IS NULL OR s.rarity = p_rarity)
      AND (p_team IS NULL OR ct.team_name ILIKE '%' || p_team || '%')
      AND (p_query IS NULL OR s.player_name ILIKE '%' || p_query || '%')
  ),
  -- Find overlaps
  mutual_matches AS (
    SELECT 
      other_users.user_id as match_user_id,
      COUNT(DISTINCT they_have.sticker_id) as they_offer_count,
      COUNT(DISTINCT they_want.sticker_id) as they_want_count
    FROM (
      -- Users who have stickers I want
      SELECT DISTINCT us.user_id
      FROM user_stickers us
      JOIN my_wants mw ON mw.id = us.sticker_id
      WHERE us.user_id != p_user_id 
        AND us.count > 0
      
      INTERSECT
      
      -- Users who want stickers I have  
      SELECT DISTINCT us.user_id
      FROM user_stickers us
      JOIN my_have mh ON mh.id = us.sticker_id
      WHERE us.user_id != p_user_id
        AND us.wanted = true
        AND us.count = 0
    ) other_users
    -- Calculate what they can offer me
    LEFT JOIN user_stickers they_have ON (
      they_have.user_id = other_users.user_id 
      AND they_have.count > 0
      AND they_have.sticker_id IN (SELECT id FROM my_wants)
    )
    -- Calculate what they want from me
    LEFT JOIN user_stickers they_want ON (
      they_want.user_id = other_users.user_id
      AND they_want.wanted = true
      AND they_want.count = 0
      AND they_want.sticker_id IN (SELECT id FROM my_have)
    )
    GROUP BY other_users.user_id
    HAVING COUNT(DISTINCT they_have.sticker_id) >= p_min_overlap
       AND COUNT(DISTINCT they_want.sticker_id) >= p_min_overlap
  )
  SELECT 
    mm.match_user_id,
    COALESCE(p.nickname, 'Usuario') as nickname,
    mm.they_offer_count as overlap_from_them_to_me,
    mm.they_want_count as overlap_from_me_to_them,
    (mm.they_offer_count + mm.they_want_count) as total_mutual_overlap
  FROM mutual_matches mm
  LEFT JOIN profiles p ON p.id = mm.match_user_id
  ORDER BY total_mutual_overlap DESC, mm.match_user_id ASC -- Deterministic sorting
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET MUTUAL TRADE DETAIL FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_mutual_trade_detail(
  p_user_id UUID,
  p_other_user_id UUID,
  p_collection_id INTEGER
) RETURNS TABLE (
  direction TEXT, -- 'they_offer' or 'i_offer'
  sticker_id INTEGER,
  sticker_code TEXT,
  player_name TEXT,
  team_name TEXT,
  rarity TEXT,
  count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- What they can offer me (they have, I want)
  SELECT 
    'they_offer'::TEXT as direction,
    s.id as sticker_id,
    s.code as sticker_code,
    s.player_name,
    COALESCE(ct.team_name, 'Sin equipo') as team_name,
    s.rarity,
    us_them.count
  FROM user_stickers us_me
  JOIN stickers s ON s.id = us_me.sticker_id
  LEFT JOIN collection_teams ct ON ct.id = s.team_id
  JOIN user_stickers us_them ON us_them.sticker_id = s.id
  WHERE us_me.user_id = p_user_id
    AND us_them.user_id = p_other_user_id
    AND s.collection_id = p_collection_id
    AND us_me.wanted = true
    AND us_me.count = 0
    AND us_them.count > 0
  
  UNION ALL
  
  -- What I can offer them (I have, they want)
  SELECT 
    'i_offer'::TEXT as direction,
    s.id as sticker_id,
    s.code as sticker_code,
    s.player_name,
    COALESCE(ct.team_name, 'Sin equipo') as team_name,
    s.rarity,
    us_me.count
  FROM user_stickers us_them
  JOIN stickers s ON s.id = us_them.sticker_id
  LEFT JOIN collection_teams ct ON ct.id = s.team_id
  JOIN user_stickers us_me ON us_me.sticker_id = s.id
  WHERE us_them.user_id = p_other_user_id
    AND us_me.user_id = p_user_id
    AND s.collection_id = p_collection_id
    AND us_them.wanted = true
    AND us_them.count = 0
    AND us_me.count > 0
  
  ORDER BY direction, sticker_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: GRANT PERMISSIONS
-- Allow authenticated users to execute the trading functions

GRANT EXECUTE ON FUNCTION find_mutual_traders TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_trade_detail TO authenticated;

-- STEP 4: VERIFY INSTALLATION
-- Run these queries to test the functions work

-- Test 1: Check if functions exist
SELECT 
  routine_name, 
  routine_type, 
  security_type 
FROM information_schema.routines 
WHERE routine_name IN ('find_mutual_traders', 'get_mutual_trade_detail')
  AND routine_schema = 'public';

-- Test 2: Check if indexes exist  
SELECT 
  indexname, 
  tablename 
FROM pg_indexes 
WHERE indexname IN (
  'idx_user_stickers_trading',
  'idx_stickers_collection_filters', 
  'idx_collection_teams_name',
  'idx_profiles_nickname'
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- The trading system foundation is now ready!
-- Your app can now call:
-- - supabase.rpc('find_mutual_traders', {...params})  
-- - supabase.rpc('get_mutual_trade_detail', {...params})

-- Next steps:
-- 1. Test the functions with your app
-- 2. Monitor performance in production
-- 3. Continue with Phase 2: Trade Proposals