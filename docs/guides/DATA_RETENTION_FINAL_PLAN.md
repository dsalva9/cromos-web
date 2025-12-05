# Data Retention - Final Implementation Plan

**Version**: 4.0 - Final with User Feedback
**Date**: 2025-12-04
**Status**: Ready to Implement
**Environment**: DEV Database (pre-production)

---

## Executive Summary

Complete data retention system with:
- ✅ 90-day retention for deleted listings/templates
- ✅ 90-day account deletion with recovery
- ✅ Admin suspension & manual deletion
- ✅ Email notification system (placeholders until service configured)
- ✅ Password confirmation for account deletion
- ✅ Albums preserved when templates deleted
- ✅ Complete user invisibility during deletion period

**Timeline**: 3-4 weeks
**Environment**: DEV only (no production migration needed)

---

## Key Behaviors Clarified

### For Users

**Listings:**
- User deletes listing → Appears completely lost to user (no "soft delete" UI)
- Data retained 90 days for fraud prevention
- No email notifications
- User can contact support for recovery if needed

**Templates (Plantillas):**
- User deletes template → Same as listings (appears lost)
- Data retained 90 days
- **Albums (user copies) are NOT deleted** when original template is deleted
- Albums become "orphaned" but remain fully functional
- No email notifications for template deletion

**Account Deletion:**
- User must enter password to confirm (in addition to email)
- 90-day recovery period
- During 90 days:
  - User CANNOT log in or access anything
  - ALL user content invisible to normal users (as if user never existed)
  - ONLY admins can see content with "DELETED USER" label
  - Chats, listings, templates, profile completely hidden
- Email warnings sent at 7, 3, 1 days before permanent deletion
- User can cancel deletion by special recovery link in email

### For Admins

**Two Account Actions:**

**1. Suspension (Indefinite)**
- Admin suspends account with reason
- **Same immediate effects as user deletion**: No login, content invisible to normal users
- Admin sees "SUSPENDED (indefinite)" indicator
- **Does NOT automatically schedule for deletion** - account suspended indefinitely
- User receives suspension notification email
- User CANNOT recover - only admin can unsuspend
- Admin options:
  - **"Unsuspend"** → Restore account fully
  - **"Move to Deletion"** → Start 90-day countdown

**2. Move to Deletion (After Suspension)**
- Admin clicks "Move to Deletion" on suspended account
- 90-day countdown starts from that moment
- Admin sees "SUSPENDED - Deletion in X days"
- **No email warnings** sent to user (unlike user-initiated deletion)
- User CANNOT recover - only admin can unsuspend
- After 90 days: Permanent deletion
- Admin can still unsuspend during countdown to cancel deletion

**Manual Content Deletion:**
- Admin can delete listings/templates with reason
- Same 90-day retention applies
- Everything logged in audit trail

**Visibility:**
- Admins can see all deleted content
- Clear labels for users:
  - "SUSPENDED (indefinite)" - suspended but not scheduled for deletion
  - "SUSPENDED - Deletion in X days" - suspended + moved to deletion
  - "DELETED USER - X days remaining" - user self-deleted account
- Retention dashboard shows upcoming deletions

### Email System

**Current State:**
- No email service configured yet
- Implement full functionality with placeholder email sender
- Email templates created as HTML with branding placeholders
- When service configured (Resend/SendGrid/AWS SES), just swap in credentials

**Email Types:**
1. Account deletion confirmation (immediate - user-initiated only)
2. 7-day warning (user-initiated deletion only)
3. 3-day warning (user-initiated deletion only)
4. 1-day final warning (user-initiated deletion only)
5. Account permanently deleted (both user & admin deletions)
6. Deletion cancelled (user recovery)
7. **Suspension notice (admin suspends user - sent to user)**
8. Admin notification when user deletes account (sent to admins)

---

## Part 1: Database Schema Changes

### Phase 1A: Fix Album Independence (Day 1)

**Issues:**
1. Currently `user_template_copies.template_id` has `ON DELETE CASCADE`
2. Need to ensure albums are independent snapshots (don't sync with template updates)

**Fix:** Change to `ON DELETE SET NULL` and `ON UPDATE NO ACTION` for complete independence

```sql
-- Migration: 20251204000000_fix_template_copy_independence.sql

-- =====================================================
-- FIX: Make user albums independent snapshots
-- =====================================================
-- When a user copies a template, they get a snapshot.
-- Later changes to the template don't affect the album.
-- If template is deleted, album becomes "orphaned" but remains functional.
-- =====================================================

-- 1. Change FK constraint to prevent cascading from template changes
ALTER TABLE user_template_copies
DROP CONSTRAINT IF EXISTS user_template_copies_template_id_fkey;

ALTER TABLE user_template_copies
ADD CONSTRAINT user_template_copies_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES collection_templates(id)
ON DELETE SET NULL      -- Album survives template deletion (becomes orphaned)
ON UPDATE NO ACTION;    -- Album doesn't sync with template ID changes

-- 2. Allow template_id to be nullable (for orphaned albums)
ALTER TABLE user_template_copies
ALTER COLUMN template_id DROP NOT NULL;

-- 3. Add column to track if album is orphaned
ALTER TABLE user_template_copies
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN GENERATED ALWAYS AS (template_id IS NULL) STORED;

-- 4. Add comments explaining independence
COMMENT ON COLUMN user_template_copies.template_id IS
    'Reference to original template. NULL if template was deleted (orphaned album). Albums are independent snapshots - template updates do NOT affect albums.';

COMMENT ON COLUMN user_template_copies.is_orphaned IS
    'Computed column: true if original template was deleted. Orphaned albums remain fully functional.';

-- 5. Add index for orphaned albums
CREATE INDEX IF NOT EXISTS idx_user_template_copies_orphaned
ON user_template_copies(user_id)
WHERE template_id IS NULL;

-- 6. Ensure user_template_progress also independent
-- Check if FK exists on user_template_progress that might cascade
ALTER TABLE user_template_progress
DROP CONSTRAINT IF EXISTS user_template_progress_copy_id_fkey;

ALTER TABLE user_template_progress
ADD CONSTRAINT user_template_progress_copy_id_fkey
FOREIGN KEY (copy_id)
REFERENCES user_template_copies(id)
ON DELETE CASCADE      -- Progress is deleted when album is deleted (correct)
ON UPDATE NO ACTION;   -- Progress doesn't sync with copy ID changes
```

**Manual Validation:**

```sql
-- Test 1: Create test template and album
INSERT INTO collection_templates (author_id, title, is_public)
VALUES (auth.uid(), 'Test Template v1', true)
RETURNING id;  -- Note ID, say 999

-- Copy it as album
INSERT INTO user_template_copies (user_id, template_id, title, is_active)
VALUES (auth.uid(), 999, 'My Album', true)
RETURNING id;  -- Note ID, say 888

-- Test 2: Update the template (simulate author editing)
UPDATE collection_templates
SET title = 'Test Template v2 - UPDATED'
WHERE id = 999;

-- Test 3: Verify album is NOT affected by template update
SELECT id, title, template_id, is_orphaned
FROM user_template_copies
WHERE id = 888;

-- Expected: title is still 'My Album', template_id is still 999, is_orphaned is false
-- (Album is independent, doesn't sync with template updates)

-- Test 4: Delete the template
DELETE FROM collection_templates WHERE id = 999;

-- Test 5: Verify album still exists as orphaned
SELECT id, title, template_id, is_orphaned
FROM user_template_copies
WHERE id = 888;

-- Expected: Row exists, template_id is NULL, is_orphaned is TRUE

-- Test 6: Verify user can still access orphaned album
SELECT * FROM user_template_copies
WHERE id = 888
AND user_id = auth.uid();

-- Expected: Album still accessible

-- Test 7: Verify progress is preserved
SELECT *
FROM user_template_progress
WHERE copy_id = 888;

-- Expected: All progress rows still exist

-- Clean up
DELETE FROM user_template_copies WHERE id = 888;
```

**✅ Pass criteria:**
- Album survives template deletion
- Album doesn't sync with template updates
- `is_orphaned` computed correctly
- User progress preserved

---

### Phase 1B: Core Retention Schema (Days 1-2)

```sql
-- Migration: 20251204000001_create_retention_system.sql

-- =====================================================
-- DATA RETENTION SYSTEM
-- =====================================================

-- Table: retention_schedule
CREATE TABLE retention_schedule (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'listing', 'template', 'user', 'message', 'report', 'rating', 'notification'
    )),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('delete', 'anonymize')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    legal_hold_until TIMESTAMPTZ,
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    initiated_by_type TEXT CHECK (initiated_by_type IN ('user', 'admin', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    CONSTRAINT unique_entity_schedule UNIQUE(entity_type, entity_id, action)
);

CREATE INDEX idx_retention_schedule_pending ON retention_schedule(scheduled_for)
    WHERE processed_at IS NULL
    AND (legal_hold_until IS NULL OR legal_hold_until < NOW());

CREATE INDEX idx_retention_schedule_entity ON retention_schedule(entity_type, entity_id);
CREATE INDEX idx_retention_schedule_legal_hold ON retention_schedule(legal_hold_until)
    WHERE legal_hold_until IS NOT NULL;
CREATE INDEX idx_retention_schedule_initiated_by ON retention_schedule(initiated_by)
    WHERE initiated_by IS NOT NULL;

-- Add deletion markers to existing tables
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('user', 'admin'));

ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('user', 'admin'));

-- Profiles already has deleted_at from existing system
-- Just ensure suspension columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Indices for filtering
CREATE INDEX IF NOT EXISTS idx_listings_not_deleted ON trade_listings(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_not_deleted ON collection_templates(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_not_deleted ON profiles(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(id) WHERE suspended_at IS NOT NULL;

COMMENT ON TABLE retention_schedule IS 'Centralized schedule for data retention and deletion. All entities scheduled for deletion tracked here.';
COMMENT ON COLUMN retention_schedule.legal_hold_until IS 'Prevents deletion until this date (police preservation order).';
COMMENT ON COLUMN trade_listings.deleted_at IS 'When listing was marked for deletion. Hidden from all users except admins.';
COMMENT ON COLUMN collection_templates.deleted_at IS 'When template was marked for deletion. Hidden from all users except admins.';
```

**Manual Validation:**

```sql
-- Test 1: Verify retention_schedule table created
SELECT table_name FROM information_schema.tables
WHERE table_name = 'retention_schedule';
-- Expected: 1 row

-- Test 2: Verify all columns added to trade_listings
SELECT column_name FROM information_schema.columns
WHERE table_name = 'trade_listings'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type');
-- Expected: 3 rows

-- Test 3: Test constraint on entity_type
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('invalid', '1', 'delete', NOW(), 'test');
-- Expected: ERROR - invalid entity_type

-- Test 4: Insert valid row
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('listing', '1', 'delete', NOW() + INTERVAL '90 days', 'test')
RETURNING id;
-- Expected: Success, returns ID

-- Clean up
DELETE FROM retention_schedule WHERE entity_id = '1';
```

**✅ Pass criteria:** All tables/columns created, constraints work

---

### Phase 2: User Deletion Functions (Days 3-4)

See `DATA_RETENTION_COMPLETE_PLAN.md` Phase 2 for full SQL.

**Key changes from original:**
- No recovery for listings/templates (appears lost immediately)
- Account deletion requires password verification (handled in frontend)
- Only account deletion gets email notifications

**Manual Validation:** See `DATA_RETENTION_VALIDATION_STEPS.md` Phase 2

---

### Phase 3: Admin Functions (Days 5-6)

```sql
-- Migration: 20251204000003_create_admin_functions.sql

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

-- Function: admin_suspend_account
-- Suspends account indefinitely (does NOT auto-schedule deletion)
CREATE OR REPLACE FUNCTION admin_suspend_account(
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_user_email TEXT;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can suspend accounts';
    END IF;

    -- Get user email for notification
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Mark as suspended
    UPDATE profiles SET
        suspended_at = NOW(),
        suspended_by = v_admin_id,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Send suspension notification email to user
    PERFORM schedule_email(
        v_user_email,
        'admin_suspension_notice',
        jsonb_build_object(
            'user_id', p_user_id,
            'reason', p_reason,
            'suspended_at', NOW()
        )
    );

    -- Log action
    INSERT INTO moderation_logs (
        action_type,
        target_type,
        target_id,
        moderator_id,
        reason,
        created_at
    ) VALUES (
        'suspend_account',
        'user',
        p_user_id::TEXT,
        v_admin_id,
        p_reason,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User suspended (not scheduled for deletion)'
    );
END;
$$;

-- Function: admin_move_to_deletion
-- Starts 90-day countdown for suspended account
CREATE OR REPLACE FUNCTION admin_move_to_deletion(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_is_suspended BOOLEAN;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can move accounts to deletion';
    END IF;

    -- Verify account is suspended
    SELECT suspended_at IS NOT NULL INTO v_is_suspended
    FROM profiles
    WHERE id = p_user_id;

    IF NOT v_is_suspended THEN
        RAISE EXCEPTION 'Account must be suspended first';
    END IF;

    -- Schedule deletion (90 days from NOW)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type
    ) VALUES (
        'user',
        p_user_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        'admin_suspended',  -- Different from 'user_requested'
        v_admin_id,
        'admin'
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = NOW() + INTERVAL '90 days',
        reason = 'admin_suspended',
        initiated_by = v_admin_id,
        initiated_by_type = 'admin';

    -- Log action
    INSERT INTO moderation_logs (
        action_type,
        target_type,
        target_id,
        moderator_id,
        reason,
        created_at
    ) VALUES (
        'move_to_deletion',
        'user',
        p_user_id::TEXT,
        v_admin_id,
        'Moved suspended account to deletion queue',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account moved to deletion queue (90 days)',
        'scheduled_for', NOW() + INTERVAL '90 days'
    );
END;
$$;

-- Function: admin_unsuspend_account
-- Restores suspended account (cancels deletion if scheduled)
CREATE OR REPLACE FUNCTION admin_unsuspend_account(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can unsuspend accounts';
    END IF;

    -- Remove suspension
    UPDATE profiles SET
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Cancel any scheduled deletion
    DELETE FROM retention_schedule
    WHERE entity_type = 'user'
    AND entity_id = p_user_id::TEXT
    AND processed_at IS NULL;

    -- Log action
    INSERT INTO moderation_logs (
        action_type,
        target_type,
        target_id,
        moderator_id,
        reason,
        created_at
    ) VALUES (
        'unsuspend_account',
        'user',
        p_user_id::TEXT,
        v_admin_id,
        'Account restored',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account unsuspended and deletion cancelled'
    );
END;
$$;

-- Function: admin_delete_listing
-- Admin deletes a listing with reason
CREATE OR REPLACE FUNCTION admin_delete_listing(
    p_listing_id BIGINT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete listings';
    END IF;

    -- Mark listing as deleted
    UPDATE trade_listings SET
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin'
    WHERE id = p_listing_id;

    -- Schedule permanent deletion (90 days)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type
    ) VALUES (
        'listing',
        p_listing_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        p_reason,
        v_admin_id,
        'admin'
    );

    -- Log action
    INSERT INTO moderation_logs (
        action_type,
        target_type,
        target_id,
        moderator_id,
        reason,
        created_at
    ) VALUES (
        'delete_listing',
        'listing',
        p_listing_id::TEXT,
        v_admin_id,
        p_reason,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing deleted (90-day retention)'
    );
END;
$$;

-- Function: admin_delete_template
-- Admin deletes a template with reason
CREATE OR REPLACE FUNCTION admin_delete_template(
    p_template_id BIGINT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete templates';
    END IF;

    -- Mark template as deleted
    UPDATE collection_templates SET
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin'
    WHERE id = p_template_id;

    -- Schedule permanent deletion (90 days)
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type
    ) VALUES (
        'template',
        p_template_id::TEXT,
        'delete',
        NOW() + INTERVAL '90 days',
        p_reason,
        v_admin_id,
        'admin'
    );

    -- Log action
    INSERT INTO moderation_logs (
        action_type,
        target_type,
        target_id,
        moderator_id,
        reason,
        created_at
    ) VALUES (
        'delete_template',
        'template',
        p_template_id::TEXT,
        v_admin_id,
        p_reason,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Template deleted (90-day retention, albums preserved)'
    );
END;
$$;

-- Function: admin_get_retention_stats
-- Dashboard statistics
CREATE OR REPLACE FUNCTION admin_get_retention_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_pending_deletions INTEGER;
    v_legal_holds INTEGER;
    v_processed_today INTEGER;
    v_next_deletion TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view retention stats';
    END IF;

    -- Count pending deletions
    SELECT COUNT(*) INTO v_pending_deletions
    FROM retention_schedule
    WHERE processed_at IS NULL
    AND (legal_hold_until IS NULL OR legal_hold_until < NOW());

    -- Count legal holds
    SELECT COUNT(*) INTO v_legal_holds
    FROM retention_schedule
    WHERE legal_hold_until IS NOT NULL
    AND legal_hold_until > NOW();

    -- Count processed today
    SELECT COUNT(*) INTO v_processed_today
    FROM retention_schedule
    WHERE processed_at::DATE = CURRENT_DATE;

    -- Get next deletion
    SELECT MIN(scheduled_for) INTO v_next_deletion
    FROM retention_schedule
    WHERE processed_at IS NULL
    AND (legal_hold_until IS NULL OR legal_hold_until < NOW());

    RETURN jsonb_build_object(
        'pending_deletions', v_pending_deletions,
        'legal_holds', v_legal_holds,
        'processed_today', v_processed_today,
        'next_deletion', v_next_deletion
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_suspend_account TO authenticated;
GRANT EXECUTE ON FUNCTION admin_move_to_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_account TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_listing TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_template TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_retention_stats TO authenticated;
```

**Manual Validation:**

```sql
-- Test 1: Admin suspend account (without deletion scheduling)
SELECT admin_suspend_account(
    'test-user-uuid',
    'Violating community guidelines'
);
-- Expected: Success, account suspended but NOT in retention_schedule

-- Test 2: Verify not scheduled for deletion
SELECT * FROM retention_schedule
WHERE entity_type = 'user' AND entity_id = 'test-user-uuid';
-- Expected: No rows

-- Test 3: Move to deletion
SELECT admin_move_to_deletion('test-user-uuid');
-- Expected: Success, now scheduled for deletion

-- Test 4: Verify scheduled
SELECT entity_type, entity_id, reason, scheduled_for
FROM retention_schedule
WHERE entity_type = 'user' AND entity_id = 'test-user-uuid';
-- Expected: 1 row, reason = 'admin_suspended', scheduled_for = 90 days from now

-- Test 5: Unsuspend (cancels deletion)
SELECT admin_unsuspend_account('test-user-uuid');
-- Expected: Success, deletion cancelled

-- Test 6: Verify deletion cancelled
SELECT * FROM retention_schedule
WHERE entity_type = 'user' AND entity_id = 'test-user-uuid';
-- Expected: No rows

-- Clean up
UPDATE profiles SET suspended_at = NULL WHERE id = 'test-user-uuid';
```

**✅ Pass criteria:**
- Suspension doesn't auto-schedule deletion
- Move to deletion starts 90-day countdown
- Unsuspend cancels deletion
- All actions logged

---

### Phase 4: Cleanup Job (Days 7-8)

See `DATA_RETENTION_COMPLETE_PLAN.md` Phase 4 for full SQL.

**Additional function needed:**

```sql
-- Function: check_user_visibility
-- Determines if a user should be visible to current viewer
CREATE OR REPLACE FUNCTION check_user_visibility(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_deleted BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if target user is deleted
    SELECT deleted_at IS NOT NULL INTO v_is_deleted
    FROM profiles
    WHERE id = p_user_id;

    -- If user not deleted, always visible
    IF NOT v_is_deleted THEN
        RETURN TRUE;
    END IF;

    -- If deleted, only visible to admins
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_visibility TO authenticated;
```

**Manual Validation:** See `DATA_RETENTION_VALIDATION_STEPS.md` Phase 4

---

### Phase 5: Email System (Days 9-10)

**Email Sending Placeholder:**

```sql
-- Migration: 20251204000005_create_email_system.sql

-- Table: pending_emails
CREATE TABLE pending_emails (
    id BIGSERIAL PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_data JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_emails_scheduled ON pending_emails(scheduled_for)
    WHERE sent_at IS NULL AND failed_at IS NULL;

COMMENT ON TABLE pending_emails IS
    'Queue for outgoing emails. Process with external email service (Resend/SendGrid/etc).';

-- Function: schedule_email
CREATE OR REPLACE FUNCTION schedule_email(
    p_recipient_email TEXT,
    p_template_name TEXT,
    p_template_data JSONB,
    p_send_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email_id BIGINT;
BEGIN
    INSERT INTO pending_emails (
        recipient_email,
        template_name,
        template_data,
        scheduled_for
    ) VALUES (
        p_recipient_email,
        p_template_name,
        p_template_data,
        p_send_at
    )
    RETURNING id INTO v_email_id;

    RETURN v_email_id;
END;
$$;

-- Function: send_deletion_warnings
-- ONLY for USER-INITIATED account deletion (not admin-suspended)
-- ONLY for accounts, not listings/templates
CREATE OR REPLACE FUNCTION send_deletion_warnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
BEGIN
    -- 7-day warnings
    FOR v_user IN
        SELECT
            p.id,
            u.email,
            rs.scheduled_for,
            p.nickname
        FROM retention_schedule rs
        JOIN profiles p ON p.id = rs.entity_id::UUID
        JOIN auth.users u ON u.id = p.id
        WHERE rs.entity_type = 'user'
        AND rs.action = 'delete'
        AND rs.processed_at IS NULL
        AND rs.scheduled_for::DATE = (CURRENT_DATE + INTERVAL '7 days')
        AND rs.legal_hold_until IS NULL
        AND rs.reason = 'user_requested'  -- ONLY user-initiated deletions get email warnings
    LOOP
        PERFORM schedule_email(
            v_user.email,
            'deletion_warning_7_days',
            jsonb_build_object(
                'user_id', v_user.id,
                'nickname', v_user.nickname,
                'deletion_date', v_user.scheduled_for,
                'recovery_url', 'https://yourdomain.com/recover-account?token=...'  -- TODO: Generate recovery token
            ),
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;

    -- 3-day warnings (same pattern with reason = 'user_requested' filter)
    -- 1-day warnings (same pattern with reason = 'user_requested' filter)
    -- Admin-suspended accounts (reason = 'admin_suspended') do NOT get warnings

    RETURN v_count;
END;
$$;

-- Function: send_admin_notification_user_deleted
-- Notify admins when user deletes their account
CREATE OR REPLACE FUNCTION send_admin_notification_user_deleted(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
    v_user_nickname TEXT;
    v_user_email TEXT;
BEGIN
    -- Get deleted user info
    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = p_user_id;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Send email to all admins
    FOR v_admin IN
        SELECT u.email
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        WHERE p.is_admin = TRUE
    LOOP
        PERFORM schedule_email(
            v_admin.email,
            'admin_user_deleted_notification',
            jsonb_build_object(
                'deleted_user_id', p_user_id,
                'deleted_user_nickname', v_user_nickname,
                'deleted_user_email', v_user_email,
                'deleted_at', NOW()
            ),
            NOW()
        );
    END LOOP;
END;
$$;

-- Update delete_account function to trigger admin notification
-- (Add this line to the delete_account function from Phase 2)
-- PERFORM send_admin_notification_user_deleted(v_user_id);

-- Schedule cron job for email warnings
SELECT cron.schedule(
    'send-deletion-warnings',
    '0 12 * * *',  -- Daily at noon
    $$SELECT send_deletion_warnings()$$
);
```

**Email Processing Edge Function:**

```typescript
// supabase/functions/process-emails/index.ts
// PLACEHOLDER - Configure when email service ready

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get pending emails
  const { data: emails } = await supabase
    .from('pending_emails')
    .select('*')
    .is('sent_at', null)
    .is('failed_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .limit(10);

  for (const email of emails || []) {
    try {
      // TODO: Replace with actual email service
      // Examples:
      // - Resend: await resend.emails.send(...)
      // - SendGrid: await sgMail.send(...)
      // - AWS SES: await ses.sendEmail(...)

      console.log('Would send email:', {
        to: email.recipient_email,
        template: email.template_name,
        data: email.template_data
      });

      // Mark as sent
      await supabase
        .from('pending_emails')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', email.id);
    } catch (error) {
      await supabase
        .from('pending_emails')
        .update({
          failed_at: new Date().toISOString(),
          failure_reason: error.message,
          attempts: email.attempts + 1
        })
        .eq('id', email.id);
    }
  }

  return new Response('OK');
});
```

**Manual Validation:**

```sql
-- Test email scheduling
SELECT schedule_email(
    'test@example.com',
    'test_template',
    '{"test": "data"}'::jsonb
);

-- Verify email queued
SELECT * FROM pending_emails WHERE recipient_email = 'test@example.com';

-- Clean up
DELETE FROM pending_emails WHERE recipient_email = 'test@example.com';
```

**✅ Pass criteria:** Emails queued successfully (sending happens when service configured)

---

### Phase 6: RLS Policy Updates (Days 10-11)

**Critical: Hide deleted users from non-admins**

```sql
-- Migration: 20251204000006_update_rls_for_deleted_users.sql

-- =====================================================
-- RLS: Hide deleted content from non-admins
-- =====================================================

-- LISTINGS: Hide deleted from public, show to admins
DROP POLICY IF EXISTS "Public read access for active listings" ON trade_listings;
DROP POLICY IF EXISTS "Users can view own deleted listings" ON trade_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON trade_listings;

CREATE POLICY "Public read access for active listings" ON trade_listings
    FOR SELECT USING (
        status = 'active'
        AND deleted_at IS NULL
        AND check_user_visibility(user_id)  -- Hide if user is deleted
    );

CREATE POLICY "Users can view own listings" ON trade_listings
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Admins can view all listings including deleted" ON trade_listings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- TEMPLATES: Similar logic
DROP POLICY IF EXISTS "Public can view public templates" ON collection_templates;
DROP POLICY IF EXISTS "Authors can view own deleted templates" ON collection_templates;
DROP POLICY IF EXISTS "Admins can view all templates" ON collection_templates;

CREATE POLICY "Public can view active public templates" ON collection_templates
    FOR SELECT USING (
        is_public = TRUE
        AND deleted_at IS NULL
        AND check_user_visibility(author_id)  -- Hide if author is deleted
    );

CREATE POLICY "Authors can view own templates" ON collection_templates
    FOR SELECT USING (
        author_id = auth.uid()
    );

CREATE POLICY "Admins can view all templates including deleted" ON collection_templates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- PROFILES: Hide deleted users completely from non-admins
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Public can view active users only" ON profiles
    FOR SELECT USING (
        deleted_at IS NULL
        AND is_suspended = FALSE
    );

CREATE POLICY "Admins can view all users including deleted" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- CHATS: Hide chats involving deleted users from non-admins
DROP POLICY IF EXISTS "Users can view their chats" ON trade_chats;

CREATE POLICY "Users can view their active chats" ON trade_chats
    FOR SELECT USING (
        (sender_id = auth.uid() OR receiver_id = auth.uid())
        AND check_user_visibility(sender_id)
        AND check_user_visibility(receiver_id)
    );

CREATE POLICY "Admins can view all chats including deleted users" ON trade_chats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );
```

**Manual Validation:**

```sql
-- Test 1: Create test user and mark as deleted
-- (Use a test account)
UPDATE profiles SET deleted_at = NOW() WHERE id = 'test-user-uuid';

-- Test 2: Try to view as non-admin
SET ROLE anon;  -- Simulate public user
SELECT * FROM profiles WHERE id = 'test-user-uuid';
-- Expected: No rows

SELECT * FROM trade_listings WHERE user_id = 'test-user-uuid';
-- Expected: No rows

RESET ROLE;

-- Test 3: View as admin
-- Make yourself admin
UPDATE profiles SET is_admin = true WHERE id = auth.uid();

SELECT * FROM profiles WHERE id = 'test-user-uuid';
-- Expected: 1 row (admin can see)

-- Clean up
UPDATE profiles SET deleted_at = NULL WHERE id = 'test-user-uuid';
UPDATE profiles SET is_admin = false WHERE id = auth.uid();
```

**✅ Pass criteria:** Deleted users invisible to non-admins, visible to admins

---

## Part 2: Frontend Implementation

### Existing UI - Updates Needed

**Already Exists (just add countdown):**
1. `/ajustes` Sistema tab - "ELIMINAR MI CUENTA" button
   - **Update**: Add password confirmation modal
   - **Add**: Show deletion status and countdown if scheduled
   - **Add**: "Cancel Deletion" button if within 90 days

2. Listing detail page - Delete button for owners
   - **No changes needed** - already works

3. Template detail page - Delete button for authors
   - **No changes needed** - already works

4. My Listings - "Deleted" tab
   - **Update**: Add countdown display on each deleted listing
   - Example: "Deleted 5 days ago • Will be permanently removed in 85 days"

5. My Templates - "Deleted" tab
   - **Update**: Add countdown display on each deleted template
   - Example: "Deleted 5 days ago • Will be permanently removed in 85 days"

### New Components Needed

**Location:** `src/components/deletion/`

```typescript
// 1. DeletionCountdown.tsx
// Reusable countdown component
interface Props {
  deletedAt: string;
  scheduledFor: string;
  entityType: 'listing' | 'template' | 'account';
}

export function DeletionCountdown({ deletedAt, scheduledFor, entityType }: Props) {
  const daysRemaining = calculateDaysRemaining(scheduledFor);
  const daysSince = calculateDaysSince(deletedAt);

  return (
    <div className="text-sm text-muted-foreground">
      <p>Deleted {daysSince} days ago</p>
      <p className="text-destructive font-medium">
        Will be permanently removed in {daysRemaining} days
      </p>
    </div>
  );
}

// 2. DeleteAccountDialog.tsx
// Enhanced with password confirmation
export function DeleteAccountDialog() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleDelete = async () => {
    // 1. Verify password with Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password
    });

    if (authError) {
      toast.error('Incorrect password');
      return;
    }

    // 2. Verify email matches
    if (email !== userEmail) {
      toast.error('Email does not match');
      return;
    }

    // 3. Call delete_account RPC
    const { error } = await supabase.rpc('delete_account');

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account scheduled for deletion. Check your email for recovery instructions.');
      router.push('/deletion-confirmed');
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account after 90 days.
            You can cancel within this period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Confirm your email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label>Enter your password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What will be deleted:</strong>
              <ul className="list-disc list-inside mt-2">
                <li>All your marketplace listings</li>
                <li>Your private templates</li>
                <li>Your messages and chats</li>
                <li>Your profile and avatar</li>
              </ul>
              <p className="mt-2">
                You have 90 days to cancel by clicking the link in the email we'll send you.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!password || !email}
          >
            Delete My Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 3. AccountDeletionBanner.tsx
// Shows at top of all pages if account scheduled for deletion
export function AccountDeletionBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase.rpc('get_user_deletion_status');
      if (data?.is_deleted) {
        setStatus(data);
      }
    }
    checkStatus();
  }, []);

  if (!status) return null;

  return (
    <div className="bg-destructive text-destructive-foreground p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">
            Your account will be permanently deleted in {status.days_remaining} days
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCancelDeletion()}
        >
          Cancel Deletion
        </Button>
      </div>
    </div>
  );
}

// 4. CancelDeletionDialog.tsx
export function CancelDeletionDialog() {
  const handleCancel = async () => {
    const { error } = await supabase.rpc('cancel_account_deletion');

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account deletion cancelled! Your account has been restored.');
      router.refresh();
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Account Deletion</DialogTitle>
        </DialogHeader>
        <p>
          Are you sure you want to cancel your account deletion?
          Your account and all content will be restored.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleCancel}>
            Yes, Restore My Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Admin Components

**Location:** `src/components/admin/retention/`

```typescript
// 1. RetentionDashboard.tsx
export function RetentionDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.rpc('admin_get_retention_stats');
      setStats(data);
    }
    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Deletions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats?.pending_deletions}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Next deletion: {formatDate(stats?.next_deletion)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal Holds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-orange-500">
            {stats?.legal_holds}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Active preservation orders
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats?.processed_today}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Items permanently deleted
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// 2. DeletedUserBadge.tsx
// Shows "DELETED USER" badge in admin views
export function DeletedUserBadge({ user }: { user: Profile }) {
  if (!user.deleted_at) return null;

  const daysRemaining = calculateDaysRemaining(user.scheduled_deletion_at);

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
      <Trash2 className="h-4 w-4" />
      <span>DELETED USER</span>
      <span className="text-xs opacity-75">
        ({daysRemaining} days until permanent)
      </span>
    </div>
  );
}

// 3. SuspendAccountDialog.tsx
// Admin suspension (does NOT auto-schedule deletion)
export function SuspendAccountDialog({ userId }: { userId: string }) {
  const [reason, setReason] = useState('');

  const handleSuspend = async () => {
    const { error } = await supabase.rpc('admin_suspend_account', {
      p_user_id: userId,
      p_reason: reason
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('User suspended (indefinite, not scheduled for deletion)');
      onClose();
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend User Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason for suspension *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Violating community guidelines, spam, harassment..."
              rows={3}
            />
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Suspension effects:</strong>
              <ul className="list-disc list-inside mt-2">
                <li>User cannot log in</li>
                <li>All content hidden from normal users</li>
                <li>User will receive suspension notification email</li>
                <li>Account suspended indefinitely (NOT scheduled for deletion)</li>
              </ul>
              <p className="mt-2">
                After suspending, you can use "Move to Deletion" to start a 90-day countdown
                if needed.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={!reason}
          >
            Suspend User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 4. MoveToDeletionDialog.tsx
// Admin moves suspended account to deletion queue
export function MoveToDeletionDialog({ userId }: { userId: string }) {
  const handleMoveToDelete = async () => {
    const { error } = await supabase.rpc('admin_move_to_deletion', {
      p_user_id: userId
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account moved to deletion queue (90 days from now)');
      onClose();
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Account to Deletion</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This will start a 90-day countdown to permanent deletion.</strong>
            <ul className="list-disc list-inside mt-2">
              <li>Countdown starts from NOW (not suspension date)</li>
              <li>User will NOT receive email warnings</li>
              <li>User CANNOT recover - only you can unsuspend</li>
              <li>After 90 days: Account and all data permanently deleted</li>
            </ul>
            <p className="mt-2">
              You can still unsuspend during the 90 days to cancel deletion.
            </p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleMoveToDelete}
          >
            Move to Deletion Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 5. SuspendedUserCard.tsx
// Shows in user list with two-button interface
export function SuspendedUserCard({ user }: { user: Profile }) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const isScheduledForDeletion = user.deletion_scheduled_for != null;
  const daysRemaining = isScheduledForDeletion
    ? calculateDaysRemaining(user.deletion_scheduled_for)
    : null;

  const handleUnsuspend = async () => {
    const { error } = await supabase.rpc('admin_unsuspend_account', {
      p_user_id: user.id
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account unsuspended and deletion cancelled');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{user.nickname}</p>
            <div className="flex items-center gap-2 mt-1">
              {isScheduledForDeletion ? (
                <Badge variant="destructive">
                  SUSPENDED - Deletion in {daysRemaining} days
                </Badge>
              ) : (
                <Badge variant="warning">
                  SUSPENDED (indefinite)
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Reason: {user.suspension_reason}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnsuspend}
            >
              Unsuspend
            </Button>

            {!isScheduledForDeletion && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowMoveDialog(true)}
              >
                Move to Deletion
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <MoveToDeletionDialog
        userId={user.id}
        open={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
      />
    </Card>
  );
}
```

### Page Updates

**1. `/ajustes` (Account Settings) - Sistema Tab**

```typescript
// Update existing section
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-destructive">
    Eliminar mi cuenta
  </h3>

  {/* Add deletion status check */}
  {deletionStatus?.is_deleted ? (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-semibold">
          Your account is scheduled for deletion
        </p>
        <p className="mt-2">
          Permanent deletion in {deletionStatus.days_remaining} days
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setShowCancelDialog(true)}
        >
          Cancel Deletion
        </Button>
      </AlertDescription>
    </Alert>
  ) : (
    <>
      <p className="text-sm text-muted-foreground">
        Esta acción eliminará permanentemente tu cuenta y todos tus datos después de 90 días.
      </p>
      <Button
        variant="destructive"
        onClick={() => setShowDeleteDialog(true)}
      >
        ELIMINAR MI CUENTA
      </Button>
    </>
  )}

  <DeleteAccountDialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} />
  <CancelDeletionDialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} />
</div>
```

**2. `/marketplace/[id]` (Listing Detail)**

```typescript
// Add countdown if deleted (admin view)
{isAdmin && listing.deleted_at && (
  <Alert variant="destructive" className="mb-4">
    <Trash2 className="h-4 w-4" />
    <AlertDescription>
      <DeletionCountdown
        deletedAt={listing.deleted_at}
        scheduledFor={listing.scheduled_deletion_at}
        entityType="listing"
      />
      {listing.deletion_type === 'admin' && (
        <p className="mt-2 text-xs">Deleted by admin: {listing.deletion_reason}</p>
      )}
    </AlertDescription>
  </Alert>
)}
```

**3. `/mis-plantillas` (My Templates) - Deleted Tab**

```typescript
// Update each template card to show countdown
{template.deleted_at && (
  <div className="mt-2 p-2 bg-destructive/10 rounded">
    <DeletionCountdown
      deletedAt={template.deleted_at}
      scheduledFor={template.scheduled_deletion_at}
      entityType="template"
    />
  </div>
)}
```

**4. Root Layout - Add Banner**

```typescript
// app/layout.tsx or wherever root layout is
<body>
  <AccountDeletionBanner />  {/* Add this */}
  <Header />
  {children}
  <Footer />
</body>
```

**5. Admin Dashboard - Add Retention Card**

```typescript
// Add to admin dashboard
<Card>
  <CardHeader>
    <CardTitle>Data Retention</CardTitle>
    <CardDescription>
      Manage scheduled deletions and legal holds
    </CardDescription>
  </CardHeader>
  <CardContent>
    <RetentionDashboard />
    <Button asChild className="mt-4">
      <Link href="/admin/retention">
        View Full Retention Queue →
      </Link>
    </Button>
  </CardContent>
</Card>
```

**6. NEW: `/admin/retention` Page**

Full retention management dashboard with queue table, filters, legal hold controls.

---

## Email Templates

**Location:** `src/emails/` (React Email format)

```typescript
// 1. account-deletion-scheduled.tsx
import { Html, Text, Button, Container } from '@react-email/components';

export default function AccountDeletionScheduled({
  nickname,
  deletionDate,
  recoveryUrl
}: {
  nickname: string;
  deletionDate: string;
  recoveryUrl: string;
}) {
  return (
    <Html>
      <Container>
        <h1>Account Deletion Scheduled</h1>
        <Text>Hi {nickname},</Text>
        <Text>
          Your account has been scheduled for deletion on {deletionDate}.
        </Text>
        <Text>
          <strong>What happens now:</strong>
        </Text>
        <ul>
          <li>You cannot log in or access your account</li>
          <li>All your content is hidden from other users</li>
          <li>You have 90 days to cancel this deletion</li>
        </ul>
        <Button href={recoveryUrl}>
          Cancel Deletion
        </Button>
        <Text className="text-sm text-gray-500">
          If you did not request this, please contact support immediately.
        </Text>
      </Container>
    </Html>
  );
}

// 2. deletion-warning-7-days.tsx
// Similar structure, urgent tone

// 3. deletion-warning-3-days.tsx
// Similar, more urgent

// 4. deletion-warning-1-day.tsx
// Similar, final warning

// 5. account-deleted-permanent.tsx
// Confirmation that data was deleted

// 6. deletion-cancelled.tsx
// Welcome back message

// 7. admin-user-deleted.tsx
// Admin notification when user self-deletes

// 8. admin-suspension-notice.tsx
// Sent to user when admin suspends their account
export default function AdminSuspensionNotice({
  nickname,
  reason,
  suspendedAt
}: {
  nickname: string;
  reason: string;
  suspendedAt: string;
}) {
  return (
    <Html>
      <Container>
        <h1>Your Account Has Been Suspended</h1>
        <Text>Hi {nickname},</Text>
        <Text>
          Your CambioCromos account has been suspended by our moderation team.
        </Text>
        <Text>
          <strong>Reason:</strong> {reason}
        </Text>
        <Text>
          <strong>What this means:</strong>
        </Text>
        <ul>
          <li>You cannot log in or access your account</li>
          <li>All your content is hidden from other users</li>
          <li>Your account will remain suspended until reviewed by an administrator</li>
        </ul>
        <Text>
          <strong>Important:</strong> You cannot unsuspend your account yourself.
          Only an administrator can restore access.
        </Text>
        <Text>
          If you believe this was done in error or would like to appeal,
          please contact our support team at support@cambiocromo.com
        </Text>
        <Text className="text-sm text-gray-500">
          Suspended on: {suspendedAt}
        </Text>
      </Container>
    </Html>
  );
}
```

---

## Timeline

### Week 1: Backend (Days 1-8)
- **Day 1**: Phase 1A - Fix album preservation
- **Day 1-2**: Phase 1B - Core schema
- **Day 3-4**: Phase 2 - User deletion functions
- **Day 5-6**: Phase 3 - Admin functions
- **Day 7-8**: Phase 4 - Cleanup job

### Week 2: Backend Complete + Frontend Start (Days 9-14)
- **Day 9-10**: Phase 5 - Email system with placeholders
- **Day 10-11**: Phase 6 - RLS policies
- **Day 12-14**: Frontend - User components

### Week 3: Frontend + Testing (Days 15-21)
- **Day 15-16**: Frontend - Admin components
- **Day 17-18**: Frontend - Page integration
- **Day 19-21**: End-to-end testing

### Week 4: Polish (Days 22-25, if needed)
- Buffer for fixes
- Documentation
- Final testing

---

## Deployment Checklist

### Pre-Deployment
- [ ] All migrations tested locally
- [ ] All frontend components built
- [ ] Email templates created (placeholders OK)
- [ ] pg_cron extension enabled
- [ ] Privacy policy updated
- [ ] Admin team trained

### Deployment Day
- [ ] Apply migrations in order (000000 → 000006)
- [ ] Verify cron jobs: `SELECT * FROM cron.job;`
- [ ] Deploy frontend
- [ ] Deploy email Edge Function (with placeholder)
- [ ] Test user deletion flow
- [ ] Test admin suspension flow

### Post-Deployment
- [ ] Monitor first cron job execution
- [ ] Daily check: Did job run? Any errors?
- [ ] Weekly: Review retention stats

---

## When Email Service is Ready

1. Choose service (Resend recommended for simplicity)
2. Update Edge Function:
```typescript
import { Resend } from 'resend';
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

await resend.emails.send({
  from: 'CambioCromos <noreply@cambiocromo.com>',
  to: email.recipient_email,
  subject: getSubjectForTemplate(email.template_name),
  react: renderEmailTemplate(email.template_name, email.template_data)
});
```
3. Configure environment variables
4. Test email sending
5. Done!

---

## Questions?

Ready to start implementing? Let me know if you need:
- Any SQL clarifications
- Frontend component details
- Help with first migration
- Anything else!
