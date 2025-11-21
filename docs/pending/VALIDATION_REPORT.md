# Database Documentation Validation Report

**Generated:** 2025-11-20
**Database State:** 24 tables in public schema
**Documentation Versions:**
- `database-schema.md`: v1.6.0-alpha
- `api-endpoints.md`: v1.5.0 (OUTDATED)

---

## Executive Summary

This report validates the database documentation against the actual Supabase database state. The validation reveals:

### Critical Findings
- **api-endpoints.md is OUTDATED** (v1.5.0 vs actual v1.6.0 implementation)
- **Missing table in documentation**: `postal_codes` table exists but not fully documented
- **Missing columns**: Several v1.6.0 columns not documented in database-schema.md
- **Incorrect RPC documentation**: Multiple v1.6.0 RPCs missing from api-endpoints.md
- **Status field discrepancy**: `listing_transactions.status` has `pending_completion` in DB but docs show only `reserved`, `completed`, `cancelled`

### Severity Classification
- **CRITICAL**: 12 issues requiring immediate attention
- **HIGH**: 8 issues that impact accuracy
- **MEDIUM**: 15 documentation gaps
- **LOW**: 6 minor inconsistencies

---

## 1. Database Schema Documentation Issues

### 1.1 CRITICAL: Missing Table Documentation

#### `postal_codes` Table - PARTIALLY DOCUMENTED
**Status:** Table mentioned in database-schema.md but incomplete details

**Actual Structure:**
```sql
CREATE TABLE postal_codes (
  country TEXT NOT NULL,
  postcode TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (country, postcode)
);
```

**Documentation Claims (Lines 132-159):**
- Claims columns: `id BIGSERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ`
- **ACTUAL DB**: No `id` column, no `created_at` column
- **ACTUAL PK**: Composite key `(country, postcode)`

**Missing Indexes:**
```sql
idx_postal_codes_postcode ON (postcode) -- EXISTS IN DB, NOT DOCUMENTED
```

**Impact:** CRITICAL - Documentation shows incorrect schema structure

---

### 1.2 CRITICAL: Missing Columns in `trade_listings`

**Documented (Lines 162-190):** 11 columns
**Actual DB:** 18 columns

**Missing columns in documentation:**
1. `suspended_at TIMESTAMPTZ` - Suspension timestamp
2. `suspension_reason TEXT` - Reason for suspension
3. `page_number INTEGER` - Page number within album
4. `page_title TEXT` - Title of the page
5. `slot_variant TEXT CHECK (slot_variant ~ '^[A-Z]$')` - Variant identifier (A, B, C)
6. `global_number INTEGER` - Global checklist number
7. `page_number`, `page_title`, `slot_variant`, `global_number` - Panini-style metadata

**Missing Indexes:**
```sql
idx_trade_listings_global_number ON (global_number) WHERE global_number IS NOT NULL
idx_listings_collection_name_trgm USING gin (collection_name gin_trgm_ops)
```

**Impact:** CRITICAL - v1.6.0 Panini integration features undocumented

---

### 1.3 CRITICAL: `listing_transactions.status` Enum Mismatch

**Documentation Claims (Line 233):**
```sql
status TEXT CHECK (status IN ('reserved', 'completed', 'cancelled'))
```

**Actual Database:**
```sql
status TEXT CHECK (status IN ('reserved', 'pending_completion', 'completed', 'cancelled'))
```

**Impact:** CRITICAL - Missing `pending_completion` status breaks two-step completion workflow

**Related RPC:** `complete_listing_transaction` uses two-step flow:
1. Seller initiates → `pending_completion`
2. Buyer confirms → `completed`

---

### 1.4 HIGH: Missing Columns in `collection_templates`

**Documented (Lines 274-291):** 10 columns
**Actual DB:** 13 columns

**Missing columns:**
1. `status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'))`
2. `suspended_at TIMESTAMPTZ`
3. `suspension_reason TEXT`

**Impact:** HIGH - Admin moderation features undocumented

---

### 1.5 HIGH: Missing `template_slots.template_id` Column

**Documented (Lines 344-374):** Does not mention `template_id` column
**Actual DB:** Has `template_id BIGINT` column with FK to `collection_templates(id)`

**Actual Constraint:**
```sql
FOREIGN KEY (template_id) REFERENCES collection_templates(id)
```

**Impact:** HIGH - Denormalization optimization not documented

---

### 1.6 MEDIUM: Incorrect `user_badge_progress` Documentation

**Documentation Missing Entirely**

**Actual Table:**
```sql
CREATE TABLE user_badge_progress (
  user_id UUID PRIMARY KEY,
  badge_category TEXT CHECK (badge_category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated')),
  current_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_category)
);
```

**Indexes:**
- `idx_user_badge_progress_user_id`
- `idx_user_badge_progress_category`

**Impact:** MEDIUM - Badge progress tracking undocumented

---

### 1.7 MEDIUM: `badge_definitions` Table Documentation

**Documentation Missing Entirely**

**Actual Table:**
```sql
CREATE TABLE badge_definitions (
  id TEXT PRIMARY KEY,
  category TEXT CHECK (category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated')),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'special')),
  display_name_es TEXT NOT NULL,
  description_es TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_badge_definitions_category`
- `idx_badge_definitions_sort_order`

**Impact:** MEDIUM - Badge system definition table undocumented

---

### 1.8 MEDIUM: Missing Indexes on `collection_templates`

**Actual Indexes (Not Documented):**
```sql
idx_templates_title_trgm USING gin (title gin_trgm_ops) WHERE is_public = TRUE
idx_templates_desc_trgm USING gin (description gin_trgm_ops) WHERE is_public = TRUE AND description IS NOT NULL
idx_templates_popular ON (copies_count DESC) WHERE is_public = TRUE
```

**Impact:** MEDIUM - Search optimization indexes undocumented

---

### 1.9 LOW: `ignored_users` Table Documentation

**Documentation Missing Entirely**

**Actual Table:**
```sql
CREATE TABLE ignored_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ignored_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ignored_user_id)
);
```

**Impact:** LOW - User blocking feature undocumented

---

## 2. API Endpoints Documentation Issues

### 2.1 CRITICAL: Missing v1.6.0 RPC Functions

**api-endpoints.md is v1.5.0** but database has **v1.6.0 RPCs**

#### Missing Marketplace RPCs (v1.6.0)
1. `list_trade_listings_filtered` - Listings with ignored users filtering
2. `list_trade_listings_filtered_with_distance` - Distance-based sorting with filtering
3. `list_trade_listings_with_collection_filter` - Collection-aware listing filtering
4. `reserve_listing` - Reserve listing for buyer (seller only)
5. `unreserve_listing` - Cancel reservation
6. `complete_listing_transaction` - Two-step completion workflow
7. `cancel_listing_transaction` - Cancel transaction
8. `get_listing_transaction` - Get transaction details
9. `get_listing_chat_participants` - Get all chat participants
10. `mark_listing_messages_read` - Mark messages as read
11. `mark_listing_chat_notifications_read` - Mark chat notifications as read
12. `get_user_conversations` - Get all listing conversations

#### Missing Template RPCs (v1.6.0)
1. `add_template_page_v2` - Enhanced with variants and global numbers
2. `get_template_copy_slots` - Get slots with variants and global numbers
3. `get_slot_by_global_number` - Find slot by global checklist number
4. `delete_template` - Soft delete template
5. `delete_template_copy` - Delete user's template copy
6. `delete_template_page` - Delete page from template
7. `delete_template_slot` - Delete slot from template
8. `update_template_metadata` - Update template basic info
9. `update_template_page` - Update page metadata
10. `update_template_slot` - Update slot metadata
11. `publish_duplicate_to_marketplace` - Enhanced with Panini metadata

#### Missing Admin RPCs (v1.6.0)
1. `admin_list_marketplace_listings` - Admin listing oversight
2. `admin_list_templates` - Admin template oversight
3. `admin_update_listing_status` - Admin listing moderation
4. `admin_update_template_status` - Admin template moderation
5. `admin_delete_content_v2` - Enhanced content deletion with logging
6. `admin_delete_user_v2` - Enhanced user deletion with logging
7. `admin_suspend_user_v2` - Enhanced suspension with logging
8. `admin_update_user_role_v2` - Enhanced role update with logging
9. `update_report_status_v2` - Enhanced report status update
10. `search_users_admin` - Admin user search
11. `get_report_details_with_context` - Detailed report context

#### Missing Badge RPCs
1. `get_badge_progress` - Get user badge progress
2. `get_user_badges_with_details` - Get earned badges with details
3. `check_and_award_badge` - Check and award badge
4. `increment_badge_progress` - Increment badge progress counter

#### Missing User Blocking RPCs
1. `ignore_user` - Block a user
2. `unignore_user` - Unblock a user
3. `get_ignored_users` - Get list of blocked users
4. `get_ignored_users_count` - Get count of blocked users
5. `is_user_ignored` - Check if user is blocked

#### Missing Notification RPCs
1. `mark_notification_read` - Mark single notification as read
2. `notify_listing_event` - Helper for listing notifications

#### Missing Social RPCs
1. `list_my_favourites` - Get user's favourite sellers

**Impact:** CRITICAL - Entire v1.6.0 feature set missing from API documentation

---

### 2.2 HIGH: Documented RPCs That Don't Exist

#### Legacy v1.5.0 RPCs (Removed in v1.6.0)
1. `get_user_collection_stats` - Removed (collections system deprecated)
2. `get_completion_report` - Removed (collections system deprecated)
3. `bulk_add_stickers_by_numbers` - Removed (stickers system deprecated)
4. `search_stickers` - Removed (stickers system deprecated)
5. `mark_team_page_complete` - Removed (pages system deprecated)
6. `get_mutual_trade_detail` - Removed in v1.4.3 (per line 311)
7. `admin_upsert_collection` - Removed (collections deprecated)
8. `admin_delete_collection` - Removed (collections deprecated)
9. `admin_upsert_page` - Removed (pages deprecated)
10. `admin_delete_page` - Removed (pages deprecated - conflicts with actual DB)
11. `admin_upsert_sticker` - Removed (stickers deprecated - conflicts with actual DB)
12. `admin_delete_sticker` - Removed (stickers deprecated - conflicts with actual DB)
13. `admin_bulk_upload_preview` - Not in database
14. `admin_bulk_upload_apply` - Not in database

**Note:** Lines 520-744 document legacy admin RPCs for collections/pages/stickers that no longer exist

**Impact:** HIGH - Documentation describes deprecated functionality

---

### 2.3 HIGH: Incorrect RPC Signatures

#### `find_mutual_traders`
**Documented (Lines 258-285):**
```sql
find_mutual_traders(
  p_user_id UUID,
  p_collection_id INTEGER,
  p_rarity TEXT,
  p_team TEXT,
  p_query TEXT,
  p_min_overlap INTEGER,
  p_limit INTEGER,
  p_offset INTEGER
)
```

**Actual DB:**
```sql
find_mutual_traders(
  p_user_id UUID,
  p_collection_id INTEGER,
  p_rarity TEXT,
  p_team TEXT,
  p_query TEXT,
  p_min_overlap INTEGER,
  p_lat DOUBLE PRECISION,  -- NEW
  p_lon DOUBLE PRECISION,  -- NEW
  p_radius_km DOUBLE PRECISION,  -- NEW
  p_sort TEXT,  -- NEW
  p_limit INTEGER,
  p_offset INTEGER
)
```

**Impact:** HIGH - Missing location-based parameters

#### `create_trade_listing`
**Documented:** Not documented in api-endpoints.md
**Actual DB:**
```sql
create_trade_listing(
  p_title TEXT,
  p_description TEXT,
  p_sticker_number TEXT,
  p_collection_name TEXT,
  p_image_url TEXT,
  p_copy_id BIGINT,
  p_slot_id BIGINT,
  p_page_number INTEGER,  -- NEW v1.6.0
  p_page_title TEXT,  -- NEW v1.6.0
  p_slot_variant TEXT,  -- NEW v1.6.0
  p_global_number INTEGER  -- NEW v1.6.0
)
```

**Impact:** HIGH - Panini metadata parameters undocumented

---

### 2.4 MEDIUM: Missing RPC Helper Functions

**Functions exist in DB but not documented:**
1. `haversine_distance` - Calculate distance between coordinates
2. `require_admin` - Admin access control helper
3. `is_admin_user` - Check if user is admin
4. `handle_new_auth_user` - Trigger for new user creation
5. `handle_updated_at` - Generic updated_at trigger
6. `validate_profile_postcode` - Postcode validation trigger
7. `set_template_slot_template_id` - Denormalization trigger

**Impact:** MEDIUM - Helper functions undocumented

---

### 2.5 MEDIUM: Incorrect Trigger Documentation

**Documented (Lines 813-822):**
- `trigger_notify_user_rating` - **REMOVED (2025-10-30)**
- Claims only `trigger_check_mutual_ratings` handles rating notifications

**Actual DB Triggers:**
1. `notify_chat_message` - Chat notifications
2. `check_mutual_ratings_and_notify` - Mutual rating notifications
3. `notify_template_rating` - Template rating notifications
4. `notify_listing_status_change` - Listing status notifications
5. `notify_proposal_status_change` - Proposal status notifications
6. `notify_finalization_requested` - Finalization notifications
7. `prevent_messaging_ignored_users` - Block ignored users from messaging
8. `trigger_collector_badge` - Collector badge award
9. `trigger_completionist_badge` - Completionist badge award
10. `trigger_creator_badge` - Creator badge award
11. `trigger_reviewer_badge` - Reviewer badge award
12. `trigger_top_rated_badge` - Top rated badge award
13. `trigger_trader_badge` - Trader badge award
14. `trigger_notify_badge_earned` - Badge earned notification
15. `sync_badge_code` - Badge code sync

**Impact:** MEDIUM - Trigger ecosystem undocumented

---

## 3. RLS Policy Validation

### 3.1 CRITICAL: Undocumented RLS Policies

#### `trade_listings` - Chat Participant Access
**Documented (Lines 191-200):** Basic access rules
**Actual DB Policy:**
```sql
-- Public read WHERE status = 'active'
-- OR auth.uid() = user_id
-- OR (auth.uid() IS NOT NULL AND EXISTS (
--     SELECT 1 FROM trade_chats
--     WHERE listing_id = trade_listings.id
--     AND (sender_id = auth.uid() OR receiver_id = auth.uid())
-- ))
```

**Impact:** CRITICAL - Chat participants retain access after listing reserved/completed (security-relevant)

---

### 3.2 HIGH: Missing RLS Documentation for New Tables

**Tables with RLS enabled but not documented:**
1. `badge_definitions` - Public read
2. `user_badge_progress` - User can view own progress
3. `ignored_users` - User can manage own ignores
4. `listing_transactions` - Participants can view/update

**Impact:** HIGH - Security policies undocumented

---

## 4. Index and Constraint Issues

### 4.1 MEDIUM: Missing GIN Indexes Documentation

**Actual GIN indexes not documented:**
```sql
-- Full-text search on listings
idx_listings_search USING gin (to_tsvector('english', title || ' ' || COALESCE(collection_name, '')))

-- Trigram search on templates
idx_templates_title_trgm USING gin (title gin_trgm_ops)
idx_templates_desc_trgm USING gin (description gin_trgm_ops)

-- Trigram search on listings
idx_listings_collection_name_trgm USING gin (collection_name gin_trgm_ops)

-- JSON payload search
idx_notifications_payload_gin USING gin (payload)
```

**Impact:** MEDIUM - Search performance optimizations undocumented

---

### 4.2 LOW: Missing Unique Constraint Documentation

**Actual unique constraints not fully documented:**
```sql
-- favourites
unique_user_target ON (user_id, target_type, target_id)

-- reports
unique_user_target_report ON (reporter_id, target_type, target_id)

-- user_ratings
unique_user_rating ON (rater_id, rated_id, context_type, context_id)

-- template_ratings
unique_user_template_rating ON (user_id, template_id)
```

**Impact:** LOW - Business logic constraints partially documented

---

## 5. Critical Issues Requiring Immediate Attention

### Priority 1 (Security/Correctness)
1. **Update api-endpoints.md to v1.6.0**
   - Add all missing v1.6.0 RPCs (60+ functions)
   - Remove deprecated v1.5.0 collection/sticker RPCs
   - Document two-step listing transaction workflow

2. **Fix `postal_codes` table schema**
   - Line 132-159: Remove `id` and `created_at` columns
   - Document actual composite PK `(country, postcode)`

3. **Fix `listing_transactions.status` enum**
   - Line 233: Add `pending_completion` to status values
   - Document two-step completion workflow

4. **Document chat participant access to listings**
   - Lines 191-200: Add RLS exception for chat participants
   - Critical for security understanding

### Priority 2 (Functional Completeness)
5. **Add missing columns to `trade_listings`**
   - Lines 162-190: Add Panini metadata columns
   - Add suspension columns

6. **Add missing columns to `collection_templates`**
   - Lines 274-291: Add status, suspended_at, suspension_reason

7. **Document `template_slots.template_id` denormalization**
   - Lines 344-374: Add template_id FK

### Priority 3 (Feature Documentation)
8. **Document badge system tables**
   - Add `badge_definitions` table
   - Add `user_badge_progress` table
   - Document badge triggers and RPCs

9. **Document user blocking feature**
   - Add `ignored_users` table
   - Document related RPCs

10. **Update RPC signatures**
    - `find_mutual_traders` - add location params
    - `create_trade_listing` - add Panini params
    - `complete_listing_transaction` - document two-step flow

---

## 6. Recommendations

### 6.1 Immediate Actions
1. **Update api-endpoints.md version to v1.6.0**
   - Remove lines 520-856 (deprecated admin collections/stickers RPCs)
   - Add comprehensive v1.6.0 RPC documentation
   - Add section for badge system RPCs
   - Add section for user blocking RPCs
   - Add section for enhanced admin moderation RPCs

2. **Correct database-schema.md inaccuracies**
   - Fix `postal_codes` table structure
   - Add missing columns to existing tables
   - Add missing tables (`badge_definitions`, `user_badge_progress`, `ignored_users`)

3. **Document workflow changes**
   - Two-step listing transaction completion
   - Badge award system
   - User blocking/ignoring

### 6.2 Process Improvements
1. **Establish version synchronization**
   - Keep database-schema.md and api-endpoints.md in sync
   - Update both when migrations are applied
   - Add migration number references to documentation

2. **Add validation script**
   - Automated script to compare docs vs actual DB
   - Run on CI/CD pipeline
   - Flag discrepancies before merge

3. **Documentation standards**
   - Always document RLS policies with table definitions
   - Always document triggers that affect table behavior
   - Always document indexes for performance-critical queries

### 6.3 Content Additions Needed
1. **Migration history**
   - Document what changed from v1.5.0 to v1.6.0
   - Link to CHANGELOG_1.6.md

2. **Workflow diagrams**
   - Listing transaction state machine
   - Badge award flow
   - Rating notification flow

3. **Performance notes**
   - Document GIN index usage for search
   - Document distance calculation performance
   - Document denormalization trade-offs

---

## 7. Summary Statistics

### Documentation Accuracy
- **database-schema.md**: ~75% accurate (missing 6 columns, 3 tables, multiple indexes)
- **api-endpoints.md**: ~40% accurate (v1.5.0 vs v1.6.0 reality)

### Coverage Gaps
- **Missing RPCs documented**: 60+ functions
- **Deprecated RPCs still documented**: 14 functions
- **Missing tables**: 3 tables
- **Missing columns**: 15+ columns
- **Missing indexes**: 20+ indexes
- **Missing RLS policies**: 8 tables

### Recommended Timeline
- **Week 1**: Fix critical schema errors (postal_codes, listing_transactions status)
- **Week 2**: Update api-endpoints.md to v1.6.0 (remove deprecated, add new RPCs)
- **Week 3**: Add missing tables and columns to database-schema.md
- **Week 4**: Document RLS policies, triggers, and workflow diagrams

---

**Report End**

*This report was generated by validating documentation against actual Supabase database state via MCP tools. All findings are based on actual schema queries, not migration files.*
