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
