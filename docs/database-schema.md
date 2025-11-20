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
- `postcode` TEXT (Optional - used for distance-based marketplace sorting)
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

**Constraints:**

- `profiles_nickname_present` CHECK (trim(coalesce(nickname, '')) <> '' AND lower(trim(nickname)) <> 'sin nombre') NOT VALID
- `idx_profiles_nickname_ci` UNIQUE INDEX ON (lower(trim(nickname))) WHERE trim(coalesce(nickname, '')) <> '' AND lower(trim(nickname)) <> 'sin nombre'

### postal_codes

Spanish postal code centroids for distance calculations (v1.6.0).

**Columns:**

- `country` TEXT NOT NULL (currently only 'ES')
- `postcode` TEXT NOT NULL
- `lat` DOUBLE PRECISION NOT NULL (latitude of postcode centroid)
- `lon` DOUBLE PRECISION NOT NULL (longitude of postcode centroid)

**Constraints:**

- PRIMARY KEY (country, postcode)

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
- `status` TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'completed', 'sold', 'removed')) ✅ **v1.6.0 UPDATED**
- `views_count` INTEGER DEFAULT 0
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- `copy_id` BIGINT REFERENCES user_template_copies(id) ON DELETE SET NULL
- `slot_id` BIGINT REFERENCES template_slots(id) ON DELETE SET NULL
- `suspended_at` TIMESTAMPTZ (timestamp when listing was suspended)
- `suspension_reason` TEXT (reason for suspension)
- `page_number` INTEGER (page number within the album/template, e.g., 12)
- `page_title` TEXT (title of the page, e.g., "Delanteros")
- `slot_variant` TEXT CHECK (slot_variant IS NULL OR slot_variant ~ '^[A-Z]$') (variant identifier A, B, C for slots at same position)
- `global_number` INTEGER (global checklist number, e.g., 1-773 in Panini albums)

**Indices:**

- `idx_listings_user` ON (user_id)
- `idx_listings_status` ON (status) WHERE status = 'active'
- `idx_listings_created` ON (created_at DESC)
- `idx_listings_search` USING GIN (to_tsvector('english', title || ' ' || COALESCE(collection_name, ''))) - Full-text search
- `idx_listings_collection_name_trgm` USING GIN (collection_name gin_trgm_ops) - Fuzzy search on collection names
- `idx_listings_copy` ON (copy_id) WHERE copy_id IS NOT NULL
- `idx_listings_slot` ON (slot_id) WHERE slot_id IS NOT NULL
- `idx_trade_listings_global_number` ON (global_number) WHERE global_number IS NOT NULL - Quick lookup by Panini number

**RLS Policies:** ✅ **UPDATED (2025-10-30)**

- **Public read** WHERE:
  - `status = 'active'` (anyone can view active listings), OR
  - `auth.uid() = user_id` (sellers always have access to their own listings), OR
  - User has chat participation ✅ **v1.6.0 SECURITY FEATURE**:
    ```sql
    EXISTS (
      SELECT 1 FROM trade_chats
      WHERE listing_id = trade_listings.id
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
    ```
    This allows chat participants to retain access to listings even after they become 'reserved' or 'completed', ensuring conversation history remains accessible.
- **Insert**: Users can insert their own listings (user_id = auth.uid())
- **Update**: Users can update their own listings (WITH CHECK: user_id = auth.uid()) ✅ **v1.6.0 FIXED**
- **Delete**: Users can delete their own listings
- **Admin override**: Admins can update/delete any listing

**Related RPCs:**

- `create_trade_listing(title, description, sticker_number, collection_name, image_url)`
- `list_trade_listings(limit, offset, search)`
- `list_trade_listings_with_distance(limit, offset, search, viewer_postcode, sort_by_distance)` ✅ **v1.6.0 NEW**
- `get_user_listings(user_id, limit, offset)`
- `update_listing_status(listing_id, new_status)`
- `reserve_listing(listing_id, buyer_id, note)` ✅ **v1.6.0 USED** - Creates transaction, updates status to 'reserved'
- `complete_listing_transaction(transaction_id)` ✅ **v1.6.0 UPDATED** - Completes transaction, sends notification
- `cancel_listing_transaction(transaction_id, reason)` - Cancels reservation
- `get_listing_transaction(listing_id)` ✅ **v1.6.0 USED** - Gets transaction details
- `get_listing_chats(listing_id)`
- `send_listing_message(listing_id, message)`
- `add_system_message_to_listing_chat(listing_id, message)` ✅ **v1.6.0 USED** - Adds system messages
- `publish_duplicate_to_marketplace(copy_id, slot_id, title, description, image_url)`
- `mark_listing_sold_and_decrement(listing_id)`
- `get_my_listings_with_progress(status)`
- `admin_delete_content(content_type, content_id, reason)`

---

### listing_transactions ✅ **v1.6.0 NEW**

Tracks reservation and completion workflow for marketplace listings.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `listing_id` BIGINT REFERENCES trade_listings(id) ON DELETE CASCADE NOT NULL
- `seller_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `buyer_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `status` TEXT CHECK (status IN ('reserved', 'pending_completion', 'completed', 'cancelled')) NOT NULL
- `reserved_at` TIMESTAMPTZ DEFAULT NOW() NOT NULL
- `completed_at` TIMESTAMPTZ
- `cancelled_at` TIMESTAMPTZ
- `cancellation_reason` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW() NOT NULL
- `updated_at` TIMESTAMPTZ DEFAULT NOW() NOT NULL

**Indices:**

- `idx_listing_transactions_active` UNIQUE ON (listing_id) WHERE status IN ('reserved', 'completed') - Ensures one active transaction per listing
- `idx_listing_transactions_listing` ON (listing_id)
- `idx_listing_transactions_seller` ON (seller_id)
- `idx_listing_transactions_buyer` ON (buyer_id)
- `idx_listing_transactions_status` ON (status)

**RLS Policies:**

- **Read**: Users can view transactions where they are seller OR buyer
  - `auth.uid() = seller_id OR auth.uid() = buyer_id`
- **Insert**: Sellers can create reservations (via `reserve_listing` RPC)
  - Validation: listing must belong to seller
- **Update**: Sellers or buyers can update transaction status
  - Seller: can complete or cancel
  - Buyer: can confirm completion
  - Enforced via SECURITY DEFINER RPCs
- **Admin override**: Admins have full access to all transactions

**Related RPCs:**

- `reserve_listing(listing_id, buyer_id, note)` - Creates transaction with status 'reserved'
- `complete_listing_transaction(transaction_id)` - Updates to 'completed', sends notifications
- `cancel_listing_transaction(transaction_id, reason)` - Updates to 'cancelled', reverts listing
- `get_listing_transaction(listing_id)` - Retrieves transaction details

**Workflow:**

1. **Reserve**: Seller uses `reserve_listing` → creates transaction (status: 'reserved'), listing status → 'reserved'
2. **Complete**: Seller marks completed → transaction status → 'pending_completion', buyer receives notification with "confirm" action
3. **Confirm**: Buyer confirms → transaction status → 'completed', both can rate each other
4. **Cancel**: Seller can cancel → transaction status → 'cancelled', listing → 'active'

---

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
- `status` TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'))
- `suspended_at` TIMESTAMPTZ (timestamp when template was suspended)
- `suspension_reason` TEXT (reason for suspension)

**Indices:**

- `idx_templates_author` ON (author_id)
- `idx_templates_public` ON (is_public) WHERE is_public = TRUE
- `idx_templates_rating` ON (rating_avg DESC, rating_count DESC) WHERE is_public = TRUE
- `idx_templates_created` ON (created_at DESC) WHERE is_public = TRUE
- `idx_templates_popular` ON (copies_count DESC) WHERE is_public = TRUE - Popularity sorting
- `idx_templates_title_trgm` USING GIN (title gin_trgm_ops) WHERE is_public = TRUE - Fuzzy search on titles
- `idx_templates_desc_trgm` USING GIN (description gin_trgm_ops) WHERE is_public = TRUE AND description IS NOT NULL - Fuzzy search on descriptions

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
- `template_id` BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL
- `page_id` BIGINT REFERENCES template_pages(id) ON DELETE CASCADE NOT NULL
- `slot_number` INTEGER NOT NULL
- `slot_variant` TEXT ✅ **v1.6.1 NEW** - Optional variant (A, B, C) for sub-slots
- `global_number` INTEGER ✅ **v1.6.1 NEW** - Optional global checklist number
- `label` TEXT
- `is_special` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(page_id, slot_number, slot_variant) ✅ **v1.6.1 UPDATED**
- CHECK (slot_variant IS NULL OR slot_variant ~ '^[A-Z]$')
- UNIQUE INDEX on (template_id, global_number) WHERE global_number IS NOT NULL

**Indices:**

- `idx_template_slots_page` ON (page_id, slot_number)
- `idx_template_slots_global_number` ON (global_number) WHERE global_number IS NOT NULL ✅ **v1.6.1 NEW**
- `idx_template_slots_unique_global_number` UNIQUE ON (get_template_id_from_page(page_id), global_number) WHERE global_number IS NOT NULL ✅ **v1.6.1 NEW**

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

- **UNIQUE**(user_id, template_id) - One copy per template per user
- **Business logic**: User can only copy each template once (can have multiple active collections from different templates)

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

- **UNIQUE**(user_id, target_type, target_id) - User can only favourite each entity once
- **Business logic**: Prevents duplicate favourites

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

- **UNIQUE**(rater_id, rated_id, context_type, context_id) - One rating per transaction
- **Business logic**: User can only rate another user once per trade/listing

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

- **UNIQUE**(user_id, template_id) - One rating per template per user
- **Business logic**: User can only rate each template once (can update existing rating)

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

- **UNIQUE**(reporter_id, target_type, target_id) - One report per entity per user
- **Business logic**: User can only report each entity once (prevents spam reporting)

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
- `collection_id` INTEGER (collection context for the trade)
- `from_user` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL (user initiating the proposal)
- `to_user` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL (user receiving the proposal)
- `status` TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired'))
- `message` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Indices:**

- `idx_proposals_from_user` ON (from_user, status)
- `idx_proposals_to_user` ON (to_user, status)
- `idx_proposals_collection` ON (collection_id)

**RLS Policies:**

- Users can read their own proposals (as proposer or receiver)
- Users can create proposals
- Users can update their own proposals

### trade_proposal_items

Items included in trade proposals.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `proposal_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE NOT NULL
- `sticker_id` INTEGER NOT NULL (reference to sticker)
- `direction` TEXT NOT NULL CHECK (direction IN ('offer', 'request')) (whether this is offered or requested)
- `quantity` INTEGER NOT NULL CHECK (quantity > 0) (number of stickers)

**Indices:**

- `idx_items_proposal` ON (proposal_id)

**RLS Policies:**

- Follows trade_proposals policies

### trade_chats ✅ **UPDATED (2025-10-30)**

Chat messages within trades and listings. Supports bidirectional conversations for both trade proposals and marketplace listings with context-aware system messages.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `trade_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE (nullable - for trade chats)
- `listing_id` BIGINT REFERENCES trade_listings(id) ON DELETE SET NULL (nullable - for listing chats)
- `sender_id` UUID REFERENCES profiles(id) ON DELETE CASCADE (nullable for system messages)
- `receiver_id` UUID REFERENCES profiles(id) ON DELETE CASCADE (nullable for system messages)
- `message` TEXT NOT NULL (max 500 characters)
- `is_read` BOOLEAN DEFAULT FALSE NOT NULL
- `is_system` BOOLEAN DEFAULT FALSE NOT NULL ✅ **NEW (2025-10-28)** - Identifies system-generated messages
- `visible_to_user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE ✅ **NEW (2025-10-28)** - Restricts visibility to specific user (NULL = visible to all)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- CHECK `trade_chats_either_trade_or_listing`: Each message belongs to EITHER a trade OR a listing (mutually exclusive)

**Indices:**

- `idx_chats_trade` ON (trade_id, created_at)
- `idx_trade_chats_listing` ON (listing_id) WHERE listing_id IS NOT NULL
- `idx_trade_chats_receiver_id` ON (receiver_id)
- `idx_trade_chats_is_read` ON (receiver_id, is_read) WHERE is_read = FALSE
- `idx_trade_chats_is_system` ON (listing_id, is_system) WHERE is_system = TRUE ✅ **NEW**
- `idx_trade_chats_visible_to_user` ON (listing_id, visible_to_user_id) WHERE visible_to_user_id IS NOT NULL ✅ **NEW**

**RLS Policies:**

- Users can read chats where they are sender or receiver
- Users can read system messages targeted to them or with NULL visibility
- Users can insert chats
- Users can update is_read on received messages
- Chat participants can access listing even after reserved/completed (via listing RLS exception) ✅ **NEW (2025-10-30)**

**Related RPCs:**

- `get_listing_chats(listing_id, participant_id)` - Returns regular + system messages filtered by visibility
- `add_system_message_to_listing_chat(listing_id, message, visible_to_user_id)` - Creates system messages
- `add_listing_status_messages(listing_id, reserved_buyer_id, message_type)` - Sends context-aware notifications
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

User notifications system (Sprint 15: Modernized for marketplace, templates, and ratings).

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `kind` TEXT NOT NULL CHECK (kind IN ('chat_unread', 'proposal_accepted', 'proposal_rejected', 'finalization_requested', 'listing_chat', 'listing_reserved', 'listing_completed', 'user_rated', 'template_rated', 'admin_action'))
- `trade_id` BIGINT REFERENCES trade_proposals(id) ON DELETE CASCADE
- `listing_id` BIGINT REFERENCES trade_listings(id) ON DELETE CASCADE
- `template_id` BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE
- `rating_id` BIGINT
- `actor_id` UUID REFERENCES profiles(id) ON DELETE SET NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `read_at` TIMESTAMPTZ
- `payload` JSONB DEFAULT '{}'::jsonb

**Notification Kinds:**

- **Legacy Trades:** `chat_unread`, `proposal_accepted`, `proposal_rejected`, `finalization_requested`
- **Marketplace:** `listing_chat`, `listing_reserved`, `listing_completed`
- **Ratings:** `user_rated`, `template_rated`
- **Admin:** `admin_action`

**Indices:**

- `idx_notifications_user_read` ON (user_id, read_at)
- `idx_notifications_user_kind_read` ON (user_id, kind, read_at)
- `idx_notifications_user_trade_kind_read` ON (user_id, trade_id, kind, read_at)
- `idx_notifications_trade_id` ON (trade_id)
- `idx_notifications_listing_id` ON (listing_id)
- `idx_notifications_template_id` ON (template_id)
- `idx_notifications_rating_id` ON (rating_id)
- `idx_notifications_actor_id` ON (actor_id)
- `idx_notifications_payload_gin` GIN (payload)
- `idx_notifications_unique_unread` UNIQUE (user_id, kind, listing_id, template_id, rating_id, trade_id) WHERE read_at IS NULL

**Triggers:** ✅ **UPDATED (2025-10-30)**

- `trigger_notify_chat_message` - Creates/updates notification on trade_chats INSERT (handles both trade and listing chats)
- ~~`trigger_notify_user_rating`~~ - **REMOVED (2025-10-30)** - Was creating premature notifications
- `trigger_check_mutual_ratings` ✅ **ONLY RATING TRIGGER** - Creates notifications ONLY after BOTH users have rated (prevents premature notifications)
- `trigger_notify_template_rating` - Creates notification on template_ratings INSERT
- `trigger_notify_listing_status_change` - Creates notifications on trade_listings status change (reserved, completed)
- `trigger_notify_proposal_status_change` - Creates notification on trade_proposals UPDATE
- `trigger_notify_finalization_requested` - Creates notification on trade_finalizations INSERT

**RLS Policies:**

- Users can SELECT their own notifications (user_id = auth.uid())
- Users can INSERT their own notifications (user_id = auth.uid())
- Users can UPDATE their own notifications (user_id = auth.uid())
- Users can DELETE their own notifications (user_id = auth.uid())

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

### badge_definitions

Stores all available badge definitions with metadata.

**Columns:**

- `id` TEXT PRIMARY KEY (badge identifier, e.g., 'collector_bronze')
- `category` TEXT NOT NULL CHECK (category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated'))
- `tier` TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'special'))
- `display_name_es` TEXT NOT NULL (Spanish display name)
- `description_es` TEXT NOT NULL (Spanish description)
- `icon_name` TEXT NOT NULL (icon identifier)
- `threshold` INTEGER NOT NULL (count required to earn badge)
- `sort_order` INTEGER NOT NULL (display ordering)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**RLS Policies:**

- **Public read**: Everyone can view badge definitions (no authentication required)
- **No write access**: Badge definitions are managed via migrations only (INSERT/UPDATE/DELETE disabled for all users)

**Related RPCs:**

- `get_user_badges_with_details(user_id)` - Returns user badges with definition details
- `check_and_award_badge(user_id, category)` - Checks progress and awards badges

---

### user_badges

Records earned badges with timestamps and progress snapshots.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `badge_code` TEXT (legacy - being phased out)
- `badge_id` TEXT REFERENCES badge_definitions(id) (reference to badge definition)
- `progress_snapshot` INTEGER (count at time of earning badge)
- `awarded_at` TIMESTAMPTZ DEFAULT NOW() (legacy timestamp)
- `earned_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, badge_id)

**RLS Policies:**

- Public read (badges are public achievements)
- Users can read their own badges
- System can insert (service-managed via RPCs)

**Related RPCs:**

- `get_user_badges_with_details(user_id)` - Returns user's earned badges with definitions
- `check_and_award_badge(user_id, category)` - Awards badge if threshold met

---

### user_badge_progress

Tracks user progress towards earning badges.

**Columns:**

- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
- `badge_category` TEXT NOT NULL CHECK (badge_category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated'))
- `current_count` INTEGER DEFAULT 0 NOT NULL
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- PRIMARY KEY (user_id, badge_category)

**RLS Policies:**

- **Read**: Users can read their own progress (user_id = auth.uid())
- **No direct write**: Progress is updated automatically via triggers and SECURITY DEFINER RPCs only
  - Users cannot manually modify progress counters
  - Prevents badge farming/cheating

**Related RPCs:**

- `get_badge_progress(user_id)` - Returns current progress for all categories
- `increment_badge_progress(user_id, category)` - Increments counter and checks for awards

**Triggers:**

- Multiple triggers increment progress automatically:
  - `trigger_collector_badge` - On user_template_copies INSERT
  - `trigger_creator_badge` - On collection_templates INSERT
  - `trigger_reviewer_badge` - On template_ratings INSERT
  - `trigger_completionist_badge` - On user_template_progress UPDATE (100% completion)
  - `trigger_trader_badge` - On trades_history INSERT (status = completed)
  - `trigger_top_rated_badge` - On user_ratings INSERT (calculates avg rating)

---

### ignored_users

Tracks user blocking relationships.

**Columns:**

- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL (user who is blocking)
- `ignored_user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL (user being blocked)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**Constraints:**

- UNIQUE(user_id, ignored_user_id)
- CHECK (user_id != ignored_user_id) - Cannot block yourself

**RLS Policies:**

- **Read**: Users can read their own ignore list (user_id = auth.uid())
- **Insert**: Users can block other users (user_id = auth.uid())
- **Delete**: Users can unblock users from their own list (user_id = auth.uid())
- **Privacy**: Users cannot see who has blocked them (one-way visibility)

**Related RPCs:**

- `ignore_user(target_user_id)` - Blocks a user
- `unignore_user(target_user_id)` - Unblocks a user
- `is_user_ignored(target_user_id)` - Checks if user is blocked
- `get_ignored_users()` - Returns list of blocked users
- `get_ignored_users_count()` - Returns count of blocked users

**Triggers:**

- `prevent_messaging_ignored_users` - Prevents sending messages to/from blocked users (enforced on trade_chats INSERT)

---

## Database Triggers

### Timestamp Management

#### `handle_updated_at`
Automatically updates `updated_at` column on row modification.

**Applied to:**
- `profiles`
- `trade_listings`
- `collection_templates`
- `trade_proposals`
- `listing_transactions`
- `reports`

**Trigger:** `BEFORE UPDATE`

---

#### `update_updated_at_column`
Generic trigger function for updating timestamps.

**Trigger:** `BEFORE UPDATE`

---

### Authentication & User Management

#### `handle_new_auth_user`
Creates profile entry when new user signs up via Supabase Auth.

**Applied to:** `auth.users`
**Trigger:** `AFTER INSERT`
**Action:** Inserts row into `profiles` with user's `id`, `email` as nickname (temporary)

---

### Validation Triggers

#### `validate_profile_postcode`
Validates Spanish postcode format (5 digits).

**Applied to:** `profiles`
**Trigger:** `BEFORE INSERT OR UPDATE`
**Validation:** `postcode ~ '^[0-9]{5}$'`

---

### Denormalization Triggers

#### `set_template_slot_template_id`
Automatically populates `template_id` in `template_slots` from parent page.

**Applied to:** `template_slots`
**Trigger:** `BEFORE INSERT`
**Action:** `NEW.template_id = (SELECT template_id FROM template_pages WHERE id = NEW.page_id)`

**Purpose:** Denormalization for faster queries - avoids JOIN through pages table

---

### Notification Triggers

#### `notify_chat_message`
Creates/updates notifications when chat messages are sent.

**Applied to:** `trade_chats`
**Trigger:** `AFTER INSERT`
**Actions:**
- Creates `chat_unread` or `listing_chat` notification for receiver
- Updates existing notification or creates new one
- Handles both trade proposal chats and listing chats

---

#### `notify_listing_status_change`
Sends notifications when listing status changes.

**Applied to:** `trade_listings`
**Trigger:** `AFTER UPDATE OF status`
**Notifications:**
- `listing_reserved` - When seller reserves listing for buyer
- `listing_completed` - When transaction completes

---

#### `notify_proposal_status_change`
Sends notifications when trade proposal status changes.

**Applied to:** `trade_proposals`
**Trigger:** `AFTER UPDATE OF status`
**Notifications:**
- `proposal_accepted` - When receiver accepts
- `proposal_rejected` - When receiver rejects

---

#### `notify_finalization_requested`
Notifies when trade finalization is requested.

**Applied to:** `trade_finalizations`
**Trigger:** `AFTER INSERT`
**Notification:** `finalization_requested`

---

#### `notify_template_rating`
Notifies template author when someone rates their template.

**Applied to:** `template_ratings`
**Trigger:** `AFTER INSERT`
**Notification:** `template_rated`

---

#### `check_mutual_ratings_and_notify`
Creates notifications ONLY after BOTH users have rated each other.

**Applied to:** `user_ratings`
**Trigger:** `AFTER INSERT`
**Logic:**
- Checks if both users have rated each other in same context
- If yes: creates `user_rated` notification for BOTH users
- If no: does nothing (waits for second rating)

**Purpose:** Prevents premature "you've been rated" notifications

---

### Badge Award Triggers

#### `trigger_collector_badge`
Awards collector badges when user copies templates.

**Applied to:** `user_template_copies`
**Trigger:** `AFTER INSERT`
**Progress:** Increments `collector` category count
**Thresholds:** Bronze (1), Silver (5), Gold (10+)

---

#### `trigger_creator_badge`
Awards creator badges when user creates public templates.

**Applied to:** `collection_templates`
**Trigger:** `AFTER INSERT WHERE is_public = TRUE`
**Progress:** Increments `creator` category count
**Thresholds:** Bronze (1), Silver (3), Gold (5+)

---

#### `trigger_reviewer_badge`
Awards reviewer badges when user rates templates.

**Applied to:** `template_ratings`
**Trigger:** `AFTER INSERT`
**Progress:** Increments `reviewer` category count
**Thresholds:** Bronze (5), Silver (20), Gold (50+)

---

#### `trigger_completionist_badge`
Awards completionist badges when user completes template 100%.

**Applied to:** `user_template_progress`
**Trigger:** `AFTER UPDATE`
**Logic:** Checks if template is 100% complete
**Progress:** Increments `completionist` category count
**Thresholds:** Bronze (1), Silver (3), Gold (5+)

---

#### `trigger_trader_badge`
Awards trader badges when trades complete successfully.

**Applied to:** `trades_history`
**Trigger:** `AFTER INSERT WHERE status = 'completed'`
**Progress:** Increments `trader` category count
**Thresholds:** Bronze (5), Silver (20), Gold (50+)

---

#### `trigger_top_rated_badge`
Awards top-rated badges based on user rating average.

**Applied to:** `user_ratings`
**Trigger:** `AFTER INSERT OR UPDATE`
**Logic:** Recalculates rater's average rating
**Progress:** Updates `top_rated` category based on avg rating
**Thresholds:** Bronze (4.0+), Silver (4.5+), Gold (4.8+)

---

#### `trigger_notify_badge_earned`
Sends notification when user earns a badge.

**Applied to:** `user_badges`
**Trigger:** `AFTER INSERT`
**Notification:** `badge_earned` with badge details in payload

---

#### `sync_badge_code`
Maintains legacy `badge_code` field for backwards compatibility.

**Applied to:** `user_badges`
**Trigger:** `BEFORE INSERT OR UPDATE`
**Action:** Syncs `badge_code` from `badge_id`

---

### Security Triggers

#### `prevent_messaging_ignored_users`
Blocks messages between users who have blocked each other.

**Applied to:** `trade_chats`
**Trigger:** `BEFORE INSERT`
**Validation:**
- Checks if sender has blocked receiver
- Checks if receiver has blocked sender
- Raises exception if blocked relationship exists

**Purpose:** Enforces user blocking at database level

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
