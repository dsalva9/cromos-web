# Database Schema

This document outlines the database structure for the Cromos Web application using Supabase (PostgreSQL).

## Core Tables

### `profiles`

User profile information extending Supabase auth.users

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `profiles_pkey` PRIMARY KEY on `id`

**RLS Policies:**

- `Enable read access for users based on user_id` - Users can view their own profile
- `Enable insert for users based on user_id` - Users can create their own profile
- `Enable update for users based on user_id` - Users can update their own profile
- `Enable delete for users based on user_id` - Users can delete their own profile
- `Update own profile` - Authenticated users can update their own profile
- `Enable insert for authenticated users only` - Only authenticated users can create profiles

### `collections`

Sticker collections/albums (e.g., World Cup 2022, Premier League 2024)

```sql
CREATE TABLE collections (
  id INTEGER PRIMARY KEY DEFAULT nextval('collections_id_seq'),
  name TEXT NOT NULL,
  competition TEXT NOT NULL,
  year TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `collections_pkey` PRIMARY KEY on `id`

**RLS Policies:**

- `Anyone can view collections` - Public read access to all collections

### `collection_teams`

Teams within each collection

```sql
CREATE TABLE collection_teams (
  id INTEGER PRIMARY KEY DEFAULT nextval('collection_teams_id_seq'),
  collection_id INTEGER REFERENCES collections(id),
  team_name TEXT NOT NULL,
  team_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `collection_teams_pkey` PRIMARY KEY on `id`

**RLS Policies:**

- `Anyone can view teams` - Public read access to all teams

### `stickers`

Individual stickers within collections

```sql
CREATE TABLE stickers (
  id INTEGER PRIMARY KEY DEFAULT nextval('stickers_id_seq'),
  collection_id INTEGER REFERENCES collections(id),
  team_id INTEGER REFERENCES collection_teams(id),
  code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT,
  nationality TEXT,
  rating INTEGER,
  rarity TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collection_id, code)
);
```

**Indexes:**

- `stickers_pkey` PRIMARY KEY on `id`
- `stickers_collection_id_code_key` UNIQUE on `(collection_id, code)`
- `idx_stickers_collection_id` INDEX on `collection_id`

**RLS Policies:**

- `Anyone can view stickers` - Public read access to all stickers

### `user_collections`

User participation in collections (which albums they're collecting)

```sql
CREATE TABLE user_collections (
  user_id UUID REFERENCES profiles(id),
  collection_id INTEGER REFERENCES collections(id),
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, collection_id)
);
```

**Indexes:**

- `user_collections_pkey` PRIMARY KEY on `(user_id, collection_id)`
- `idx_user_collections_active` INDEX on `(user_id, is_active)`

**RLS Policies:**

- `Users can manage their own collections` - Users have full access to their collection participations

### `user_stickers`

User's sticker inventory (owned stickers and wanted list)

```sql
CREATE TABLE user_stickers (
  user_id UUID REFERENCES profiles(id),
  sticker_id INTEGER REFERENCES stickers(id),
  count INTEGER NOT NULL,
  wanted BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, sticker_id)
);
```

**Indexes:**

- `user_stickers_pkey` PRIMARY KEY on `(user_id, sticker_id)`
- `idx_user_stickers_user_id` INDEX on `user_id`

**RLS Policies:**

- `Users can manage their own stickers` - Users have full access to their sticker inventory

## Functions & Triggers

### Update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stickers_updated_at
    BEFORE UPDATE ON user_stickers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Storage Buckets

### `sticker-images`

- Public bucket for sticker images
- File size limit: 2MB
- Allowed file types: image/jpeg, image/png, image/webp

### `collection-images`

- Public bucket for collection/album cover images
- File size limit: 5MB
- Allowed file types: image/jpeg, image/png, image/webp

### `team-logos`

- Public bucket for team logos
- File size limit: 1MB
- Allowed file types: image/jpeg, image/png, image/webp, image/svg+xml

### `avatars`

- Public bucket for user avatars
- File size limit: 2MB
- Allowed file types: image/jpeg, image/png, image/webp
- RLS: Users can upload/update their own avatar

## Data Flow & Relationships

### Collection Structure

1. **Collections** (World Cup 2022, Premier League 2024, etc.)
2. **Teams** within each collection
3. **Stickers** for each player/team within the collection
4. **Users** join collections they want to collect
5. **User Stickers** track what each user owns/wants

### Key Relationships

- Collections → Teams (1:many)
- Teams → Stickers (1:many)
- Collections → Stickers (1:many)
- Users → Collections (many:many via user_collections)
- Users → Stickers (many:many via user_stickers with count/wanted flags)

## Query Patterns

### Get user's collection progress

```sql
SELECT
  c.name as collection_name,
  COUNT(s.id) as total_stickers,
  COUNT(us.sticker_id) as owned_stickers,
  (COUNT(us.sticker_id) * 100.0 / COUNT(s.id)) as completion_percentage
FROM collections c
JOIN user_collections uc ON c.id = uc.collection_id
JOIN stickers s ON c.id = s.collection_id
LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = uc.user_id AND us.count > 0
WHERE uc.user_id = $1 AND uc.is_active = true
GROUP BY c.id, c.name;
```

### Find users who have stickers I want

```sql
SELECT DISTINCT p.nickname, p.id
FROM profiles p
JOIN user_stickers us_have ON p.id = us_have.user_id
JOIN user_stickers us_want ON us_have.sticker_id = us_want.sticker_id
WHERE us_want.user_id = $1
  AND us_want.wanted = true
  AND us_have.count > 0
  AND us_have.user_id != $1;
```

## Migration History

1. **v1.0** - Initial setup: profiles, collections, collection_teams, stickers
2. **v1.1** - Added user_collections for user participation tracking
3. **v1.2** - Added user_stickers for inventory and wishlist management
4. **Current** - Established RLS policies and indexes for performance

---

## Schema Updates

When updating the schema:

1. Create migration files in `supabase/migrations/`
2. Test thoroughly in development
3. Update this documentation
4. Apply to staging environment
5. Deploy to production during maintenance window

```bash
# Create new migration
supabase migration new add_feature_name

# Apply migration locally
supabase db reset

# Push to remote
supabase db push

# Update documentation
git add docs/database-schema.md
git commit -m "docs: update schema for [feature]"
git push origin main
```
