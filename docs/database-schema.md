# Database Schema

This document outlines the database structure for the Cromos Web application using Supabase (PostgreSQL).

## Core Tables

### `profiles`

User profile information extending Supabase auth.users

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `profiles_username_idx` on `username`
- `profiles_created_at_idx` on `created_at`

**RLS Policies:**

- Users can view all profiles
- Users can update only their own profile

### `collections`

User's card collections

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `collections_user_id_idx` on `user_id`
- `collections_name_idx` on `name`

### `cards`

Individual sports cards

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  year INTEGER,
  brand TEXT,
  card_number TEXT,
  player_name TEXT,
  team TEXT,
  position TEXT,
  condition TEXT CHECK (condition IN ('mint', 'near_mint', 'excellent', 'very_good', 'good', 'fair', 'poor')),
  image_url TEXT,
  description TEXT,
  is_for_trade BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `cards_collection_id_idx` on `collection_id`
- `cards_sport_idx` on `sport`
- `cards_player_name_idx` on `player_name`
- `cards_is_for_trade_idx` on `is_for_trade`

### `trades`

Trading proposals and history

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**Indexes:**

- `trades_proposer_id_idx` on `proposer_id`
- `trades_recipient_id_idx` on `recipient_id`
- `trades_status_idx` on `status`

### `trade_items`

Cards included in trade proposals

```sql
CREATE TABLE trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  offered_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `trade_items_trade_id_idx` on `trade_id`
- `trade_items_card_id_idx` on `card_id`

### `wishlists`

User's wanted cards

```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  player_name TEXT,
  year INTEGER,
  brand TEXT,
  card_number TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `wishlists_user_id_idx` on `user_id`
- `wishlists_sport_idx` on `sport`
- `wishlists_player_name_idx` on `player_name`

## Row Level Security (RLS) Policies

### `profiles`

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

### `collections`

```sql
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Users can view public collections and their own private ones
CREATE POLICY "Collections visibility" ON collections FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- Users can manage their own collections
CREATE POLICY "Users can manage own collections" ON collections FOR ALL
USING (auth.uid() = user_id);
```

### `cards`

```sql
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Cards are viewable based on collection visibility
CREATE POLICY "Cards visibility" ON cards FOR SELECT
USING (
  collection_id IN (
    SELECT id FROM collections
    WHERE is_public = true OR user_id = auth.uid()
  )
);

-- Users can manage cards in their own collections
CREATE POLICY "Users can manage own cards" ON cards FOR ALL
USING (
  collection_id IN (
    SELECT id FROM collections WHERE user_id = auth.uid()
  )
);
```

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

-- Apply to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Storage Buckets

### `card-images`

- Public bucket for card images
- File size limit: 5MB
- Allowed file types: image/jpeg, image/png, image/webp
- RLS: Users can upload to their own folders

### `avatars`

- Public bucket for user avatars
- File size limit: 2MB
- Allowed file types: image/jpeg, image/png, image/webp
- RLS: Users can upload/update their own avatar

## Migration Strategy

1. **Initial Setup** - Create core tables (profiles, collections, cards)
2. **Trading System** - Add trades and trade_items tables
3. **Wishlist Feature** - Add wishlists table
4. **Future Enhancements** - Add indexes and optimizations as needed

## Backup & Maintenance

- **Daily automated backups** via Supabase
- **Weekly schema exports** for version control
- **Monthly performance review** of queries and indexes
- **Quarterly data cleanup** of expired trades and inactive accounts

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
supabase migration new add_new_table

# Apply migration
supabase db push

# Update documentation
git add docs/database-schema.md
git commit -m "docs: update schema for new feature"
git push origin main
```
