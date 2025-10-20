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

## Marketplace System (v1.6.0)

### trade_listings

User-created marketplace listings for physical cards.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `title` TEXT NOT NULL
- `description` TEXT
- `sticker_number` TEXT
- `collection_name` TEXT
- `image_url` TEXT
- `status` TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed'))
- `views_count` INTEGER DEFAULT 0
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_listings_user` ON (user_id)
- `idx_listings_status` ON (status) WHERE status = 'active'
- `idx_listings_created` ON (created_at DESC)
- `idx_listings_search` USING GIN (to_tsvector('english', title || ' ' || COALESCE(collection_name, '')))

**RLS Policies:**

- Public read WHERE status = 'active'
- Users can insert their own listings
- Users can update/delete their own listings
- Admins can update/delete any listing

**Related RPCs:**

- `create_trade_listing(title, description, sticker_number, collection_name, image_url)`
- `list_trade_listings(limit, offset, search)`
- `get_user_listings(user_id, limit, offset)`
- `update_listing_status(listing_id, new_status)`

## Collection Templates System (v1.6.0)

### collection_templates

Community-created collection templates.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `author_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `title` TEXT NOT NULL
- `description` TEXT
- `image_url` TEXT
- `is_public` BOOLEAN DEFAULT FALSE
- `rating_avg` DECIMAL(3,2) DEFAULT 0.0
- `rating_count` INTEGER DEFAULT 0
- `copies_count` INTEGER DEFAULT 0
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_templates_author` ON (author_id)
- `idx_templates_public` ON (is_public) WHERE is_public = TRUE
- `idx_templates_rating` ON (rating_avg DESC, rating_count DESC) WHERE is_public = TRUE
- `idx_templates_created` ON (created_at DESC) WHERE is_public = TRUE

**RLS Policies:**

- Public read WHERE is_public = TRUE
- Authors can read their own templates
- Authors can insert/update/delete their own templates
- Admins can update/delete any template

**Related RPCs:**

- `create_template(title, description, image_url, is_public)`
- `publish_template(template_id, is_public)`
- `list_public_templates(limit, offset, search, sort_by)`

### template_pages

Pages within a template.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `template_id` BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL
- `page_number` INTEGER NOT NULL
- `title` TEXT NOT NULL
- `type` TEXT CHECK (type IN ('team', 'special'))
- `slots_count` INTEGER NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(template_id, page_number)

**Indices:**

- `idx_template_pages_template` ON (template_id, page_number)

**RLS Policies:**

- Public read WHERE template is public
- Authors can manage their template pages

**Related RPCs:**

- `add_template_page(template_id, title, type, slots)`

### template_slots

Individual slots within pages.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `page_id` BIGINT REFERENCES template_pages(id) ON DELETE CASCADE NOT NULL
- `slot_number` INTEGER NOT NULL
- `label` TEXT
- `is_special` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(page_id, slot_number)

**Indices:**

- `idx_template_slots_page` ON (page_id, slot_number)

**RLS Policies:**

- Follows template_pages policies

### user_template_copies

User copies of templates.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `template_id` BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL
- `title` TEXT NOT NULL
- `is_active` BOOLEAN DEFAULT FALSE
- `copied_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, template_id)
- UNIQUE(user_id, is_active) WHERE is_active = TRUE

**Indices:**

- `idx_copies_user` ON (user_id, is_active)
- `idx_copies_template` ON (template_id)

**RLS Policies:**

- Users can read their own copies
- Users can insert/update/delete their own copies

**Related RPCs:**

- `copy_template(template_id, custom_title)`
- `get_my_template_copies()`

### user_template_progress

Progress tracking for each slot in user's copy.

**Columns:**

- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE
- `copy_id` BIGINT REFERENCES user_template_copies(id) ON DELETE CASCADE
- `slot_id` BIGINT REFERENCES template_slots(id) ON DELETE CASCADE
- `status` TEXT DEFAULT 'missing' CHECK (status IN ('missing', 'owned', 'duplicate'))
- `count` INTEGER DEFAULT 0 CHECK (count >= 0)
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- PRIMARY KEY (user_id, copy_id, slot_id)

**Indices:**

- `idx_progress_copy` ON (copy_id, status)
- `idx_progress_duplicates` ON (user_id, copy_id, slot_id) WHERE status = 'duplicate'

**RLS Policies:**

- Users can manage their own progress

**Related RPCs:**

- `get_template_progress(copy_id)`
- `update_template_progress(copy_id, slot_id, status, count)`

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

Chat messages within trades and listings.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposal_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE
- `listing_id` BIGINT REFERENCES trade_listings(id) ON DELETE CASCADE
- `sender_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `receiver_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `message` TEXT NOT NULL
- `is_read` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- CHECK: (proposal_id IS NOT NULL) OR (listing_id IS NOT NULL)

**Indices:**

- `idx_chats_proposal` ON (proposal_id, created_at)
- `idx_chats_listing` ON (listing_id, created_at) WHERE listing_id IS NOT NULL
- `idx_chats_receiver` ON (receiver_id, is_read) WHERE is_read = FALSE

**RLS Policies:**

- Users can read chats where they are sender or receiver
- Users can insert chats
- Users can update is_read on received messages

**Related RPCs:**

- `get_listing_chats(listing_id)`
- `send_listing_message(listing_id, message)`

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

### Marketplace Functions

- `create_trade_listing`
- `list_trade_listings`
- `get_user_listings`
- `update_listing_status`
- `get_listing_chats`
- `send_listing_message`

### Template Functions

- `create_template`
- `add_template_page`
- `publish_template`
- `list_public_templates`
- `copy_template`
- `get_my_template_copies`
- `get_template_progress`
- `update_template_progress`

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

**v1.6.0-alpha** (Current) - Post-cleanup + Marketplace + Templates

- Removed 7 tables (old collections system)
- Removed 7 RPCs
- Added trade_listings table
- Added 6 marketplace RPCs
- Extended trade_chats for listings
- Added 5 template system tables
- Added 8 template RPCs

**v1.5.0** - Original collections system (deprecated)

---

**For complete RPC signatures and usage examples, see `docs/api-endpoints.md`**
