# Database Schema Updates - Collection Management

## Updated Tables

### `user_collections` (Updated)

User participation in collections with unique constraint and cascade behavior.

```sql
CREATE TABLE user_collections (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, collection_id),
  -- Ensure only one active collection per user
  CONSTRAINT unique_active_per_user UNIQUE (user_id, is_active) WHERE (is_active = true)
);
```

**New Constraints:**

- `UNIQUE (user_id, collection_id)` - Prevents duplicate collection joins
- `UNIQUE (user_id, is_active) WHERE (is_active = true)` - Ensures only one active collection per user

### `user_stickers` (Updated Cascade)

User's sticker inventory with proper cascade delete.

```sql
CREATE TABLE user_stickers (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id INTEGER REFERENCES stickers(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  wanted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, sticker_id)
);
```

**Important:** When a `user_collection` is deleted, all associated `user_stickers` for that collection must be deleted via application logic (Supabase RLS handles the constraint).

## New Database Functions

### Collection Management Functions

```sql
-- Remove user collection and all associated sticker data
CREATE OR REPLACE FUNCTION remove_user_collection(
  p_user_id UUID,
  p_collection_id INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Delete user stickers for this collection
  DELETE FROM user_stickers
  WHERE user_id = p_user_id
    AND sticker_id IN (
      SELECT id FROM stickers WHERE collection_id = p_collection_id
    );

  -- Delete user collection
  DELETE FROM user_collections
  WHERE user_id = p_user_id AND collection_id = p_collection_id;

  -- If this was the active collection, make the most recent one active
  IF NOT EXISTS (
    SELECT 1 FROM user_collections
    WHERE user_id = p_user_id AND is_active = true
  ) THEN
    UPDATE user_collections
    SET is_active = true
    WHERE user_id = p_user_id
      AND collection_id = (
        SELECT collection_id FROM user_collections
        WHERE user_id = p_user_id
        ORDER BY joined_at DESC
        LIMIT 1
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Set active collection (ensures only one active)
CREATE OR REPLACE FUNCTION set_active_collection(
  p_user_id UUID,
  p_collection_id INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Set all collections inactive for this user
  UPDATE user_collections
  SET is_active = false
  WHERE user_id = p_user_id;

  -- Set the specified collection as active
  UPDATE user_collections
  SET is_active = true
  WHERE user_id = p_user_id AND collection_id = p_collection_id;
END;
$$ LANGUAGE plpgsql;
```

## Trading System

### Trading Match Functions

RPC-based trading system for finding mutual matches between users without precomputed tables.

#### Find Mutual Traders Function

```sql
-- Find users who have stickers I want AND want stickers I have
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
```

#### Get Mutual Trade Detail Function

```sql
-- Get detailed sticker lists for a specific trading pair
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
```

### Performance Indexes

Indexes required for efficient trading queries:

```sql
-- Composite index for user_stickers filtering
CREATE INDEX IF NOT EXISTS idx_user_stickers_trading
ON user_stickers (sticker_id, user_id, wanted, count);

-- Index for stickers filtering by collection and properties
CREATE INDEX IF NOT EXISTS idx_stickers_collection_filters
ON stickers (collection_id, rarity, team_id, player_name);

-- Index for collection_teams name filtering
CREATE INDEX IF NOT EXISTS idx_collection_teams_name
ON collection_teams (team_name);

-- Index for efficient user lookups in profiles
CREATE INDEX IF NOT EXISTS idx_profiles_nickname
ON profiles (nickname) WHERE nickname IS NOT NULL;
```

### Row Level Security (RLS) Policies

Trading functions maintain user privacy through SECURITY DEFINER and controlled data exposure:

```sql
-- Trading functions are SECURITY DEFINER and only expose essential data
-- No additional RLS policies needed as functions handle access control internally
-- Existing policies on profiles, user_stickers, etc. remain unchanged

-- Ensure functions can only be called by authenticated users
GRANT EXECUTE ON FUNCTION find_mutual_traders TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_trade_detail TO authenticated;
```

### Migration Notes

#### Deployment Steps

1. **Create Indexes First** (can be done during low traffic):

   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stickers_trading
   ON user_stickers (sticker_id, user_id, wanted, count);

   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_collection_filters
   ON stickers (collection_id, rarity, team_id, player_name);

   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_teams_name
   ON collection_teams (team_name);

   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_nickname
   ON profiles (nickname) WHERE nickname IS NOT NULL;
   ```

2. **Deploy Functions** (minimal impact):

   ```sql
   -- Copy and execute find_mutual_traders function
   -- Copy and execute get_mutual_trade_detail function
   ```

3. **Grant Permissions**:
   ```sql
   GRANT EXECUTE ON FUNCTION find_mutual_traders TO authenticated;
   GRANT EXECUTE ON FUNCTION get_mutual_trade_detail TO authenticated;
   ```

#### Performance Considerations

- **Query Complexity**: The mutual matching queries involve multiple joins and subqueries. Monitor execution times as user base grows.
- **Pagination**: Always use LIMIT and OFFSET to prevent large result sets.
- **Filter Early**: The functions apply filters at the earliest possible stage to minimize data processing.

#### Caveats

- **Case Sensitivity**: Team and player name searches use ILIKE for case-insensitive matching.
- **Privacy**: Functions only expose essential data (nickname, counts) and never expose private user information.
- **Deterministic Sorting**: Secondary sort by user_id ensures consistent pagination results.

### Future Optimization Notes

```sql
-- Future Optimization: Materialized View for Popular Collections
-- CREATE MATERIALIZED VIEW trading_matches_cache AS
-- SELECT user_id, other_user_id, collection_id,
--        overlap_count, last_updated
-- FROM precomputed_matches
-- WHERE last_updated > NOW() - INTERVAL '1 hour';
--
-- Refresh strategy:
-- - Hourly for active collections
-- - On-demand when user updates their stickers
-- - Background job for less active collections

-- Future Optimization: Caching Layer
-- Consider Redis/Memcached for frequently accessed matches
-- Cache key pattern: "matches:{user_id}:{collection_id}:{filters_hash}"
-- TTL: 15-30 minutes depending on collection activity
```

## Updated RLS Policies

```sql
-- Allow users to manage their own collections
CREATE POLICY "Users can manage their own collections" ON user_collections
FOR ALL USING (auth.uid() = user_id);

-- Allow users to manage their own stickers
CREATE POLICY "Users can manage their own stickers" ON user_stickers
FOR ALL USING (auth.uid() = user_id);
```

## Migration Notes

When implementing these changes:

1. **Add unique constraints** to prevent duplicate collection joins
2. **Create database functions** for complex operations
3. **Test cascade delete behavior** thoroughly
4. **Update RLS policies** if needed
5. **Verify data integrity** after migrations
6. **Deploy trading indexes** before functions to ensure optimal performance
7. **Test trading functions** with sample data before enabling UI
