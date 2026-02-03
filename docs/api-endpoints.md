# API Endpoints & Operations

**Version**: v1.6.0

**Status**: ✅ Updated - This document reflects the current Supabase RPCs for the v1.6.0 release. All v1.5.0 RPCs that were removed from the database are omitted.

---

## Deprecated RPCs (Removed in v1.6.0)

The following RPCs were part of the legacy collections system and have been removed from the database. They are kept here for historical reference only.

- `get_user_collection_stats`
- `get_completion_report`
- `bulk_add_stickers_by_numbers`
- `search_stickers`
- `mark_team_page_complete`
- `find_mutual_traders`
- `get_mutual_trade_detail`
- `admin_upsert_collection`
- `admin_delete_collection`
- `admin_upsert_page`
- `admin_delete_page`
- `admin_upsert_sticker`
- `admin_delete_sticker`
- `admin_bulk_upload_preview`
- `admin_bulk_upload_apply`

---

## Marketplace RPCs

### Listings

- `create_trade_listing`
  ```sql
  create_trade_listing(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_sticker_number TEXT DEFAULT NULL,
    p_collection_name TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_copy_id BIGINT DEFAULT NULL,
    p_slot_id BIGINT DEFAULT NULL,
    p_page_number INTEGER DEFAULT NULL,
    p_page_title TEXT DEFAULT NULL,
    p_slot_variant TEXT DEFAULT NULL,
    p_global_number INTEGER DEFAULT NULL
  ) RETURNS BIGINT;
  ```

- `list_trade_listings`
  ```sql
  list_trade_listings(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0, p_search TEXT DEFAULT NULL)
  RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    title TEXT,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    copy_id BIGINT,
    slot_id BIGINT
  );
  ```

- `list_trade_listings_filtered`
  ```sql
  list_trade_listings_filtered(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_collection_filter TEXT DEFAULT NULL
  ) RETURNS TABLE (...);
  ```

- `list_trade_listings_filtered_with_distance`
  ```sql
  list_trade_listings_filtered_with_distance(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_viewer_postcode TEXT DEFAULT NULL,
    p_sort_by_distance BOOLEAN DEFAULT FALSE,
    p_collection_filter TEXT DEFAULT NULL
  ) RETURNS TABLE (..., distance_km NUMERIC);
  ```

- `reserve_listing`
  ```sql
  reserve_listing(p_listing_id BIGINT, p_buyer_id UUID, p_note TEXT DEFAULT NULL) RETURNS BIGINT;
  ```

- `complete_listing_transaction`
  ```sql
  complete_listing_transaction(p_transaction_id BIGINT) RETURNS BOOLEAN;
  ```

- `cancel_listing_transaction`
  ```sql
  cancel_listing_transaction(p_transaction_id BIGINT, p_reason TEXT DEFAULT NULL) RETURNS BOOLEAN;
  ```

- `unreserve_listing`
  ```sql
  unreserve_listing(p_listing_id BIGINT) RETURNS BOOLEAN;
  ```

- `delete_listing_with_history` ✅ **NEW (2025-12-03)**
  ```sql
  delete_listing_with_history(p_listing_id BIGINT)
  RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    deleted_chat_count INTEGER,
    deleted_transaction_count INTEGER,
    media_files_deleted INTEGER
  );
  ```

- `get_listing_transaction`
  ```sql
  get_listing_transaction(p_listing_id BIGINT) RETURNS TABLE (...);
  ```

- `mark_listing_messages_read`
  ```sql
  mark_listing_messages_read(p_listing_id BIGINT) RETURNS INTEGER;
  ```

- `mark_listing_chat_notifications_read`
  ```sql
  mark_listing_chat_notifications_read(p_listing_id BIGINT) RETURNS VOID;
  ```

### Chat

- `send_listing_message`
  ```sql
  send_listing_message(p_listing_id BIGINT, p_receiver_id UUID, p_message TEXT) RETURNS BIGINT;
  ```

- `add_system_message_to_listing_chat`
  ```sql
  add_system_message_to_listing_chat(p_listing_id BIGINT, p_message TEXT, p_visible_to_user_id UUID DEFAULT NULL) RETURNS BIGINT;
  ```

- `get_listing_chats`
  ```sql
  get_listing_chats(p_listing_id BIGINT) RETURNS TABLE (...);
  ```

- `get_listing_chat_participants`
  ```sql
  get_listing_chat_participants(p_listing_id BIGINT) RETURNS TABLE (...);
  ```

---

## Template RPCs

- `create_template`
  ```sql
  create_template(p_title TEXT, p_description TEXT, p_image_url TEXT, p_is_public BOOLEAN) RETURNS BIGINT;
  ```

- `add_template_page_v2`
  ```sql
  add_template_page_v2(
    p_template_id BIGINT,
    p_page_number INTEGER,
    p_title TEXT,
    p_type TEXT,
    p_slots_count INTEGER
  ) RETURNS BIGINT;
  ```

- `get_template_copy_slots`
  ```sql
  get_template_copy_slots(p_copy_id BIGINT) RETURNS TABLE (
    slot_id BIGINT,
    page_number INTEGER,
    slot_number INTEGER,
    slot_variant TEXT,
    global_number INTEGER,
    label TEXT,
    is_special BOOLEAN
  );
  ```

- `get_slot_by_global_number`
  ```sql
  get_slot_by_global_number(p_template_id BIGINT, p_global_number INTEGER) RETURNS TABLE (...);
  ```

- `delete_template`
  ```sql
  delete_template(p_template_id BIGINT) RETURNS VOID;
  ```

- `delete_template_copy`
  ```sql
  delete_template_copy(p_copy_id BIGINT) RETURNS VOID;
  ```

- `delete_template_page`
  ```sql
  delete_template_page(p_page_id BIGINT) RETURNS VOID;
  ```

- `delete_template_slot`
  ```sql
  delete_template_slot(p_slot_id BIGINT) RETURNS VOID;
  ```

- `update_template_metadata`
  ```sql
  update_template_metadata(p_template_id BIGINT, p_title TEXT, p_description TEXT, p_image_url TEXT) RETURNS VOID;
  ```

- `update_template_page`
  ```sql
  update_template_page(p_page_id BIGINT, p_title TEXT, p_type TEXT) RETURNS VOID;
  ```

- `update_template_slot`
  ```sql
  update_template_slot(p_slot_id BIGINT, p_label TEXT, p_is_special BOOLEAN, p_slot_variant TEXT, p_global_number INTEGER) RETURNS VOID;
  ```

- `publish_duplicate_to_marketplace`
  ```sql
  publish_duplicate_to_marketplace(
    p_copy_id BIGINT,
    p_slot_id BIGINT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
  ) RETURNS BIGINT;
  ```

---

## Admin RPCs

- `admin_list_marketplace_listings`
  ```sql
  admin_list_marketplace_listings(p_status TEXT DEFAULT NULL, p_query TEXT DEFAULT NULL, p_page INTEGER DEFAULT 1, p_page_size INTEGER DEFAULT 20) RETURNS TABLE (...);
  ```

- `admin_update_listing_status`
  ```sql
  admin_update_listing_status(p_listing_id BIGINT, p_status TEXT, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `admin_list_templates`
  ```sql
  admin_list_templates(p_status TEXT DEFAULT NULL, p_query TEXT DEFAULT NULL, p_page INTEGER DEFAULT 1, p_page_size INTEGER DEFAULT 20) RETURNS TABLE (...);
  ```

- `admin_update_template_status`
  ```sql
  admin_update_template_status(p_template_id BIGINT, p_status TEXT, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `admin_delete_content_v2`
  ```sql
  admin_delete_content_v2(p_content_type TEXT, p_content_id BIGINT, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `admin_suspend_user_v2`
  ```sql
  admin_suspend_user_v2(p_user_id UUID, p_is_suspended BOOLEAN, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `admin_update_user_role_v2`
  ```sql
  admin_update_user_role_v2(p_user_id UUID, p_is_admin BOOLEAN, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `admin_delete_user_v2`
  ```sql
  admin_delete_user_v2(p_user_id UUID, p_reason TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `update_report_status_v2`
  ```sql
  update_report_status_v2(p_report_id BIGINT, p_status TEXT, p_admin_notes TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `search_users_admin`
  ```sql
  search_users_admin(p_query TEXT DEFAULT NULL, p_status TEXT DEFAULT 'all', p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0) RETURNS TABLE (...);
  ```

---

## Badge & Blocking RPCs

- `get_badge_progress`
  ```sql
  get_badge_progress(p_user_id UUID) RETURNS TABLE (...);
  ```

- `get_user_badges_with_details`
  ```sql
  get_user_badges_with_details(p_user_id UUID) RETURNS TABLE (...);
  ```

- `check_and_award_badge`
  ```sql
  check_and_award_badge(p_user_id UUID, p_category TEXT) RETURNS TABLE (badge_awarded BOOLEAN, badge_id TEXT, badge_name TEXT);
  ```

- `increment_badge_progress`
  ```sql
  increment_badge_progress(p_user_id UUID, p_category TEXT) RETURNS INTEGER;
  ```

- `ignore_user`
  ```sql
  ignore_user(p_ignored_user_id UUID) RETURNS BOOLEAN;
  ```

- `unignore_user`
  ```sql
  unignore_user(p_ignored_user_id UUID) RETURNS BOOLEAN;
  ```

- `is_user_ignored`
  ```sql
  is_user_ignored(p_user_id UUID, p_target_user_id UUID) RETURNS BOOLEAN;
  ```

- `get_ignored_users`
  ```sql
  get_ignored_users(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0) RETURNS TABLE (
    ignored_user_id UUID,
    nickname TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
  );
  ```

- `get_ignored_users_count`
  ```sql
  get_ignored_users_count() RETURNS INTEGER;
  ```

---

## XP & Leaderboard RPCs ✅ **v1.6.2 NEW**

- `calculate_level_from_xp`
  ```sql
  calculate_level_from_xp(total_xp INT) RETURNS INT;
  ```

- `award_xp`
  ```sql
  award_xp(p_user_id UUID, p_action_type TEXT, p_xp_amount INT, p_description TEXT DEFAULT NULL) RETURNS VOID;
  ```

- `update_login_streak`
  ```sql
  update_login_streak(p_user_id UUID) RETURNS VOID;
  ```

- `refresh_leaderboard`
  ```sql
  refresh_leaderboard() RETURNS VOID;
  ```

---

## Email Forwarding RPCs ✅ **v1.6.0 NEW**

### Admin-Only Functions

- `admin_list_forwarding_addresses`
  ```sql
  admin_list_forwarding_addresses()
  RETURNS TABLE (
    id INTEGER,
    email TEXT,
    is_active BOOLEAN,
    added_by UUID,
    added_by_username TEXT,
    added_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
  );
  ```

- `admin_add_forwarding_address`
  ```sql
  admin_add_forwarding_address(p_email TEXT) RETURNS INTEGER;
  ```

- `admin_remove_forwarding_address`
  ```sql
  admin_remove_forwarding_address(p_id INTEGER) RETURNS BOOLEAN;
  ```

- `admin_toggle_forwarding_address`
  ```sql
  admin_toggle_forwarding_address(p_id INTEGER, p_is_active BOOLEAN) RETURNS BOOLEAN;
  ```

- `admin_get_inbound_email_logs`
  ```sql
  admin_get_inbound_email_logs(p_limit INTEGER DEFAULT 25, p_offset INTEGER DEFAULT 0)
  RETURNS TABLE (
    id INTEGER,
    resend_email_id TEXT,
    from_address TEXT,
    to_addresses TEXT[],
    subject TEXT,
    received_at TIMESTAMPTZ,
    forwarded_to TEXT[],
    forwarding_status TEXT,
    error_details JSONB
  );
  ```

---

## Edge Functions

### `send-email-notification`

**Purpose**: Sends transactional email notifications to users

**Trigger**: Database trigger on `notifications` table

**Authentication**: Uses SERVICE_ROLE key

**Environment Variables**:
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Email Types**:
- New chat messages
- Listing reservations
- Transaction completions
- Badge awards
- System announcements

**Rate Limiting**: Sequential sending with delays

### `receive-inbound-email`

**Purpose**: Receives inbound emails via Resend webhook and forwards to admin addresses

**Trigger**: Webhook from Resend when email arrives at @cambiocromos.com

**Authentication**: Webhook signature verification (svix)

**Environment Variables**:
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Features**:
- Webhook signature verification
- Rate limiting (600ms delay between sends)
- Formatted email templates
- Comprehensive error logging
- Status tracking (success/partial_failure/failed)

**Database Operations**:
- Fetches active addresses from `email_forwarding_addresses`
- Logs to `inbound_email_log` table
- Updates `last_used_at` timestamps

**See**: [docs/email-systems.md](./email-systems.md) for complete email documentation.

---

*All RPC signatures are provided for reference; actual implementation may include additional default parameters or security definitions.*
