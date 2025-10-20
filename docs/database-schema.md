# Database Schema - v1.6.0-alpha (Post-Cleanup)

**Current state:** Official collections system removed.
Marketplace + templates system under construction.

See CHANGELOG.md for pivot details.

## Core Tables

### profiles

Extends Supabase auth.users with additional user data.

**Columns:**

- `id` UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- `nickname` TEXT NOT NULL UNIQUE
- `avatar_url` TEXT
- `rating_avg` DECIMAL(3,2) DEFAULT 0.0
- `rating_count` INTEGER DEFAULT 0
- `is_admin` BOOLEAN DEFAULT FALSE
- `is_suspended` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_profiles_nickname` ON (nickname)
- `idx_profiles_admin` ON (is_admin) WHERE is_admin = TRUE
- `idx_profiles_suspended` ON (is_suspended) WHERE is_suspended = TRUE

**RLS Policies:**

- Public read access
- Users can update their own profile (except is_admin, is_suspended)
- Admins can update any profile

## Trading Tables

### trade_proposals

Trade proposals between users.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposer_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `receiver_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `status` TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'))
- `message` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_proposals_proposer` ON (proposer_id, status)
- `idx_proposals_receiver` ON (receiver_id, status)

**RLS Policies:**

- Users can read their own proposals (as proposer or receiver)
- Users can create proposals
- Users can update their own proposals

### trade_proposal_items

Items included in trade proposals.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposal_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE NOT NULL
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `sticker_number` TEXT NOT NULL
- `collection_name` TEXT NOT NULL

**Indices:**

- `idx_items_proposal` ON (proposal_id)

**RLS Policies:**

- Follows trade_proposals policies

### trade_chats

Chat messages within trades.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposal_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE
- `sender_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `receiver_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `message` TEXT NOT NULL
- `is_read` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_chats_proposal` ON (proposal_id, created_at)
- `idx_chats_receiver` ON (receiver_id, is_read) WHERE is_read = FALSE

**RLS Policies:**

- Users can read chats where they are sender or receiver
- Users can insert chats
- Users can update is_read on received messages

### trades_history

Completed trade history.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposal_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE NOT NULL
- `proposer_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `receiver_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `status` TEXT NOT NULL CHECK (status IN ('completed', 'cancelled'))
- `completed_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_history_users` ON (proposer_id, receiver_id)
- `idx_history_completed` ON (completed_at DESC) WHERE status = 'completed'

**RLS Policies:**

- Users can read their own trade history

### notifications

User notifications system.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `kind` TEXT NOT NULL CHECK (kind IN ('chat_unread', 'proposal_accepted', 'proposal_rejected', 'finalization_requested'))
- `trade_id` BIGINT REFERENCES trades_history(id) ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `read_at` TIMESTAMPTZ
- `metadata` JSONB

**Indices:**

- `idx_notifications_user_unread` ON (user_id, read_at) WHERE read_at IS NULL
- `idx_notifications_trade` ON (trade_id)

**RLS Policies:**

- Users can read their own notifications
- System can insert (via triggers)

### trade_finalizations

Track finalization handshake for trades.

**Columns:**

- `trade_id` BIGINT REFERENCES trades_history(id) ON DELETE CASCADE NOT NULL
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `finalized_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- PRIMARY KEY (trade_id, user_id)

**Indices:**

- `idx_finalizations_trade` ON (trade_id)

**RLS Policies:**

- Users can read finalizations for their trades
- Users can insert finalizations

### user_badges

User achievement badges.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `badge_type` TEXT NOT NULL
- `earned_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, badge_type)

**RLS Policies:**

- Public read
- Users can read their own badges
- System can insert (service-managed)

## Admin System

### audit_log

Append-only log of all admin actions.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `admin_id` UUID REFERENCES profiles(id) ON DELETE SET NULL
- `entity_type` TEXT NOT NULL
- `entity_id` BIGINT NOT NULL
- `action` TEXT NOT NULL
- `old_values` JSONB
- `new_values` JSONB
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `admin_nickname` TEXT

**Indices:**

- `idx_audit_log_admin` ON (admin_id)
- `idx_audit_log_entity` ON (entity_type, entity_id)
- `idx_audit_log_admin_nickname` ON (admin_nickname)

**RLS Policies:**

- Only admins can read
- System can insert (via RPCs with SECURITY DEFINER)
- NO UPDATE or DELETE allowed (immutable)

## RPC Functions

### Trading Functions

- `create_trade_proposal`
- `respond_to_trade_proposal`
- `list_trade_proposals`
- `get_trade_proposal_detail`
- `mark_trade_read`
- `get_unread_counts`
- `mark_trade_finalized`
- `complete_trade`
- `cancel_trade`

### Notifications Functions

- `get_notifications`
- `get_notification_count`
- `mark_all_notifications_read`

### Admin Functions

- `admin_list_users`
- `admin_update_user_role`
- `admin_suspend_user`
- `admin_delete_user`
- `admin_upsert_collection`
- `admin_delete_collection`
- `admin_upsert_page`
- `admin_delete_page`
- `admin_upsert_sticker`
- `admin_delete_sticker`
- `admin_remove_sticker_image`
- `admin_get_audit_log`

## Storage Buckets

### sticker-images

**Public:** Yes  
**Max Size:** 5 MB  
**Types:** image/jpeg, image/png, image/webp  
**Usage:** Sticker images

### avatars

**Public:** Yes  
**Max Size:** 2 MB  
**Types:** image/jpeg, image/png, image/webp  
**Usage:** User profile pictures

## Schema Version History

**v1.6.0-alpha** (Current) - Post-cleanup

- Removed 7 tables (old collections system)
- Removed 7 RPCs
- Ready for marketplace + templates system

**v1.5.0** - Original collections system (deprecated)

---

**For complete RPC signatures and usage examples, see `docs/api-endpoints.md`**
