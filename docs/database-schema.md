# Database Schema - v1.6.0-alpha (Complete)

**Current state:** Complete backend migration for marketplace + templates pivot.
Frontend implementation pending.

See CHANGELOG_1.6.md for complete pivot details.

## Overview

The CambioCromos v1.6.0 database schema represents a complete pivot from a traditional sticker collection app to a marketplace and community platform. This schema supports:

- **Marketplace System**: Physical card listings with free-form fields
- **Template System**: Community-created collection structures
- **Integration System**: Bidirectional sync between marketplace and templates
- **Social System**: Favourites, ratings, and reports
- **Admin Moderation System**: Comprehensive audit logging and moderation tools

## Schema Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    profiles     │    │  trade_listings │    │collection_templates│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ nickname        │    │ user_id (FK)    │    │ author_id (FK)  │
│ avatar_url      │◄──►│ title           │◄──►│ title           │
│ rating_avg      │    │ description     │    │ description     │
│ rating_count    │    │ sticker_number  │    │ image_url       │
│ is_admin        │    │ collection_name │    │ is_public       │
│ is_suspended    │    │ image_url       │    │ rating_avg      │
│ created_at      │    │ status          │    │ rating_count    │
│ updated_at      │    │ views_count     │    │ copies_count    │
└─────────────────┘    │ created_at      │    │ created_at      │
         │              │ updated_at      │    │ updated_at      │
         │              │ copy_id (FK)    │    └─────────────────┘
         │              │ slot_id (FK)    │             │
         │              └─────────────────┘             │
         │                       │                    │
         │                       │                    │
         │                       ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   favourites    │    │ template_pages  │    │ template_slots  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ user_id (FK)    │    │ template_id (FK)│    │ page_id (FK)    │
│ target_type     │    │ page_number     │    │ slot_number     │
│ target_id       │    │ title           │    │ label           │
│ created_at      │    │ type            │    │ is_special      │
└─────────────────┘    │ slots_count     │    │ created_at      │
         │              │ created_at      │    └─────────────────┘
         │              └─────────────────┘             │
         │                       │                    │
         │                       ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  user_ratings   │    │user_template_copies│   │user_template_progress│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ user_id (PK)    │
│ rater_id (FK)   │    │ user_id (FK)    │    │ copy_id (FK)    │
│ rated_id (FK)   │    │ template_id (FK)│    │ slot_id (FK)    │
│ rating          │    │ title           │    │ status          │
│ comment         │    │ is_active       │    │ count           │
│ context_type    │    │ copied_at       │    │ updated_at      │
│ context_id      │    └─────────────────┘    └─────────────────┘
│ created_at      │             │                    │
└─────────────────┘             ▼                    ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │template_ratings │    │     reports     │
         │              ├─────────────────┤    ├─────────────────┤
         │              │ id (PK)         │    │ id (PK)         │
         │              │ user_id (FK)    │    │ reporter_id (FK)│
         │              │ template_id (FK)│    │ target_type     │
         │              │ rating          │    │ target_id       │
         │              │ comment         │    │ reason          │
         │              │ created_at      │    │ description     │
         │              └─────────────────┘    │ status          │
         │                       │           │ admin_notes      │
         │                       ▼           │ admin_id (FK)    │
         │              ┌─────────────────┐    │ created_at      │
         │              │    audit_log     │    │ updated_at      │
         │              ├─────────────────┤    └─────────────────┘
         │              │ id (PK)         │             │
         │              │ admin_id (FK)   │             ▼
         │              │ admin_nickname  │    ┌─────────────────┐
         │              │ entity_type     │    │  notifications  │
         │              │ entity_id       │    ├─────────────────┤
         │              │ action          │    │ id (PK)         │
         │              │ old_values      │    │ user_id (FK)    │
         │              │ new_values      │    │ kind            │
         │              │ created_at      │    │ trade_id (FK)   │
         │              │ moderation_*    │    │ created_at      │
         │              └─────────────────┘    │ read_at         │
         │                       │           │ metadata         │
         │                       ▼           └─────────────────┘
         │              ┌─────────────────┐
         │              │ trading_system  │
         │              │ (legacy)        │
         │              └─────────────────┘
```

## Core Tables

### profiles

User profiles with ratings and admin status.

**Columns:**

- `id` UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- `nickname` TEXT NOT NULL UNIQUE
- `avatar_url` TEXT
- `postcode` TEXT
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
- `idx_profiles_rating_avg` ON (rating_avg DESC) WHERE rating_count > 0
- `idx_profiles_rating_count` ON (rating_count DESC)

**RLS Policies:**

- Public read access
- Users can update their own profile (except is_admin, is_suspended)
- Admins can update any profile

## Marketplace System

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
- `copy_id` BIGINT REFERENCES user_template_copies(id) ON DELETE SET NULL
- `slot_id` BIGINT REFERENCES template_slots(id) ON DELETE SET NULL

**Indices:**

- `idx_listings_user` ON (user_id)
- `idx_listings_status` ON (status) WHERE status = 'active'
- `idx_listings_created` ON (created_at DESC)
- `idx_listings_search` USING GIN (to_tsvector('english', title || ' ' || COALESCE(collection_name, '')))
- `idx_listings_copy` ON (copy_id) WHERE copy_id IS NOT NULL
- `idx_listings_slot` ON (slot_id) WHERE slot_id IS NOT NULL

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
- `get_listing_chats(listing_id)`
- `send_listing_message(listing_id, message)`
- `publish_duplicate_to_marketplace(copy_id, slot_id, title, description, image_url)`
- `mark_listing_sold_and_decrement(listing_id)`
- `get_my_listings_with_progress(status)`
- `admin_delete_content(content_type, content_id, reason)`

## Collection Templates System

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
- `admin_delete_content(content_type, content_id, reason)`

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

## Social and Reputation System

### favourites

Unified table for all favourite types.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `target_type` TEXT NOT NULL CHECK (target_type IN ('listing', 'template', 'user'))
- `target_id` BIGINT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, target_type, target_id)

**Indices:**

- `idx_favourites_user` ON (user_id)
- `idx_favourites_target` ON (target_type, target_id)
- `idx_favourites_listing` ON (target_type, target_id) WHERE target_type = 'listing'
- `idx_favourites_template` ON (target_type, target_id) WHERE target_type = 'template'
- `idx_favourites_user_target` ON (target_type, target_id) WHERE target_type = 'user'

**RLS Policies:**

- Users can read their own favourites
- Users can insert/delete their own favourites
- Public read for listing and template favourites (for counts)

**Related RPCs:**

- `toggle_favourite(target_type, target_id)`
- `is_favourited(target_type, target_id)`
- `get_favourite_count(target_type, target_id)`
- `get_user_favourites(target_type, limit, offset)`

### user_ratings

Ratings given by users to other users.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `rater_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `rated_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `rating` INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)
- `comment` TEXT
- `context_type` TEXT NOT NULL CHECK (context_type IN ('trade', 'listing'))
- `context_id` BIGINT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(rater_id, rated_id, context_type, context_id)

**Indices:**

- `idx_user_ratings_rater` ON (rater_id)
- `idx_user_ratings_rated` ON (rated_id)
- `idx_user_ratings_context` ON (context_type, context_id)
- `idx_user_ratings_created` ON (created_at DESC)

**RLS Policies:**

- Public read access (ratings are public)
- Users can insert/update/delete their own ratings

**Related RPCs:**

- `create_user_rating(rated_id, rating, comment, context_type, context_id)`
- `update_user_rating(rating_id, rating, comment)`
- `delete_user_rating(rating_id)`
- `get_user_ratings(user_id, limit, offset)`
- `get_user_rating_summary(user_id)`
- `admin_delete_content(content_type, content_id, reason)`

### template_ratings

Ratings given by users to templates.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `template_id` BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL
- `rating` INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)
- `comment` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, template_id)

**Indices:**

- `idx_template_ratings_user` ON (user_id)
- `idx_template_ratings_template` ON (template_id)
- `idx_template_ratings_created` ON (created_at DESC)

**RLS Policies:**

- Public read access (ratings are public)
- Users can insert/update/delete their own ratings

**Related RPCs:**

- `create_template_rating(template_id, rating, comment)`
- `update_template_rating(rating_id, rating, comment)`
- `delete_template_rating(rating_id)`
- `get_template_ratings(template_id, limit, offset)`
- `get_template_rating_summary(template_id)`
- `admin_delete_content(content_type, content_id, reason)`

### reports

Unified table for all report types.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `reporter_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `target_type` TEXT NOT NULL CHECK (target_type IN ('listing', 'template', 'user', 'rating'))
- `target_id` BIGINT NOT NULL
- `reason` TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate_content', 'harassment', 'copyright_violation', 'misleading_information', 'fake_listing', 'offensive_language', 'other'))
- `description` TEXT
- `status` TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed'))
- `admin_notes` TEXT
- `admin_id` UUID REFERENCES profiles(id) ON DELETE SET NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(reporter_id, target_type, target_id)

**Indices:**

- `idx_reports_reporter` ON (reporter_id)
- `idx_reports_target` ON (target_type, target_id)
- `idx_reports_status` ON (status) WHERE status = 'pending'
- `idx_reports_created` ON (created_at DESC)
- `idx_reports_admin` ON (admin_id) WHERE admin_id IS NOT NULL

**RLS Policies:**

- Users can insert/read their own reports
- Admins can read/update all reports

**Related RPCs:**

- `create_report(target_type, target_id, reason, description)`
- `get_reports(status, target_type, limit, offset)`
- `update_report_status(report_id, status, admin_notes)`
- `get_user_reports(status, limit, offset)`
- `check_entity_reported(target_type, target_id)`
- `bulk_update_report_status(report_ids, status, admin_notes)`
- `escalate_report(report_id, priority_level, reason)`

## Admin Moderation System

### audit_log

Append-only log of all admin actions.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `admin_id` UUID REFERENCES profiles(id) ON DELETE SET NULL
- `admin_nickname` TEXT
- `entity_type` TEXT
- `entity_id` BIGINT
- `action` TEXT
- `old_values` JSONB
- `new_values` JSONB
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `moderation_action_type` TEXT
- `moderated_entity_type` TEXT
- `moderated_entity_id` BIGINT
- `moderation_reason` TEXT

**Indices:**

- `idx_audit_log_admin_id` ON (admin_id) WHERE admin_id IS NOT NULL
- `idx_audit_log_entity` ON (entity_type, entity_id) WHERE entity_type IS NOT NULL
- `idx_audit_log_admin_nickname` ON (admin_nickname)
- `idx_audit_log_moderation_action` ON (moderation_action_type) WHERE moderation_action_type IS NOT NULL
- `idx_audit_log_moderated_entity` ON (moderated_entity_type, moderated_entity_id) WHERE moderated_entity_type IS NOT NULL
- `idx_audit_log_created_at` ON (created_at DESC)

**RLS Policies:**

- Only admins can read
- System can insert (via RPCs with SECURITY DEFINER)
- NO UPDATE or DELETE allowed (immutable)

**Views:**

- `moderation_audit_logs` - Audit logs filtered for moderation actions only

**Related RPCs:**

- `log_moderation_action(moderation_action_type, moderated_entity_type, moderated_entity_id, moderation_reason, old_values, new_values)`
- `get_moderation_audit_logs(moderation_action_type, moderated_entity_type, admin_id, limit, offset)`
- `get_entity_moderation_history(entity_type, entity_id)`
- `get_admin_dashboard_stats()`
- `get_recent_reports(limit)`
- `get_moderation_activity(limit)`
- `get_report_statistics()`
- `get_admin_performance_metrics(days_back)`
- `admin_update_user_role(user_id, is_admin, reason)`
- `admin_suspend_user(user_id, is_suspended, reason)`
- `admin_delete_user(user_id, reason)`
- `admin_delete_content(content_type, content_id, reason)`

**Moderation RPCs:**

- `bulk_update_report_status(report_ids, status, admin_notes)`
- `bulk_suspend_users(user_ids, is_suspended, reason)`
- `bulk_delete_content(content_type, content_ids, reason)`

## Trading Tables (Legacy)

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

## RPC Functions

### Marketplace Functions

- `create_trade_listing`
- `list_trade_listings`
- `get_user_listings`
- `update_listing_status`
- `get_listing_chats`
- `send_listing_message`
- `publish_duplicate_to_marketplace`
- `mark_listing_sold_and_decrement`
- `get_my_listings_with_progress`
- `admin_delete_content`

### Template Functions

- `create_template`
- `add_template_page`
- `publish_template`
- `list_public_templates`
- `copy_template`
- `get_my_template_copies`
- `get_template_progress`
- `update_template_progress`
- `admin_delete_content`

### Integration Functions

- `publish_duplicate_to_marketplace`
- `mark_listing_sold_and_decrement`
- `get_my_listings_with_progress`

### Social Functions

- `toggle_favourite`
- `is_favourited`
- `get_favourite_count`
- `get_user_favourites`
- `create_user_rating`
- `update_user_rating`
- `delete_user_rating`
- `get_user_ratings`
- `get_user_rating_summary`
- `create_template_rating`
- `update_template_rating`
- `delete_template_rating`
- `get_template_ratings`
- `get_template_rating_summary`
- `create_report`
- `get_reports`
- `update_report_status`
- `get_user_reports`
- `check_entity_reported`

### Admin Moderation Functions

- `log_moderation_action`
- `get_moderation_audit_logs`
- `get_entity_moderation_history`
- `admin_update_user_role`
- `admin_suspend_user`
- `admin_delete_user`
- `admin_delete_content`
- `get_admin_dashboard_stats`
- `get_recent_reports`
- `get_moderation_activity`
- `get_report_statistics`
- `get_admin_performance_metrics`
- `bulk_update_report_status`
- `bulk_suspend_users`
- `bulk_delete_content`
- `escalate_report`

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

**v1.6.0-alpha** (Current) - Complete Marketplace + Templates Pivot

- Removed 7 tables (old collections system)
- Removed 7 RPCs
- Added 13 new tables
- Added 47 new RPCs
- Complete admin moderation system with audit logging
- Comprehensive social and reputation system

**v1.5.0** - Original collections system (deprecated)

---

**For complete RPC signatures and usage examples, see `docs/api-endpoints.md`**
