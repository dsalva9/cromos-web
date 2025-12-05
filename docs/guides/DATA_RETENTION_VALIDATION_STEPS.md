# Data Retention - Manual Validation Steps

**Use this guide as you implement each phase. Run these tests before moving to the next phase.**

---

## Phase 1: Core Schema - Manual Validation

**After applying migration `20251204000000_create_retention_system.sql`:**

### Test 1: Verify Tables Created

```sql
-- Check retention_schedule table exists with all columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'retention_schedule'
ORDER BY ordinal_position;

-- Expected: 10 columns including id, entity_type, entity_id, action, scheduled_for, etc.
```

**✅ Pass criteria**: All 10 columns present

### Test 2: Verify Indices Created

```sql
-- Check all indices on retention_schedule
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'retention_schedule';

-- Expected: At least 4 indices (pending, entity, legal_hold, initiated_by)
```

**✅ Pass criteria**: 4+ indices created

### Test 3: Verify Column Additions to Existing Tables

```sql
-- Check trade_listings has deletion columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'trade_listings'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type');

-- Check collection_templates has deletion columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'collection_templates'
AND column_name IN ('deleted_at', 'deleted_by', 'deletion_type');

-- Check profiles has deletion/suspension columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('deleted_at', 'deletion_reason', 'suspended_at', 'suspended_by', 'suspension_reason');
```

**✅ Pass criteria**: All columns present in all tables

### Test 4: Test Constraints

```sql
-- Try to insert invalid entity_type (should fail)
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('invalid_type', '1', 'delete', NOW(), 'test');
-- Expected: ERROR - invalid entity_type

-- Try to insert invalid action (should fail)
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('listing', '1', 'invalid_action', NOW(), 'test');
-- Expected: ERROR - invalid action

-- Insert valid row (should succeed)
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('listing', '1', 'delete', NOW() + INTERVAL '90 days', 'test');
-- Expected: SUCCESS

-- Try to insert duplicate (should fail due to unique constraint)
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason)
VALUES ('listing', '1', 'delete', NOW() + INTERVAL '90 days', 'test2');
-- Expected: ERROR - duplicate key

-- Clean up
DELETE FROM retention_schedule WHERE entity_id = '1';
```

**✅ Pass criteria**: Constraints work as expected

### Test 5: Verify Foreign Keys

```sql
-- Check FK from retention_schedule to profiles
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type
FROM pg_constraint con
WHERE con.conrelid = 'retention_schedule'::regclass
AND con.contype = 'f';

-- Expected: FK constraint on initiated_by column
```

**✅ Pass criteria**: FK constraints present

---

## Phase 2: User Deletion Functions - Manual Validation

**After applying migration `20251204000001_create_user_deletion_functions.sql`:**

### Test 1: Verify Functions Created

```sql
-- List all deletion functions
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'delete_listing',
    'delete_template',
    'delete_account',
    'cancel_account_deletion'
)
AND routine_schema = 'public';

-- Expected: 4 functions
```

**✅ Pass criteria**: All 4 functions exist

### Test 2: Test delete_listing Function

```sql
-- First, create a test listing as a test user
-- (You'll need to be logged in as a real user for this)

-- Get your user ID
SELECT auth.uid();

-- Create a test listing (adjust values as needed)
INSERT INTO trade_listings (user_id, title, description, collection_name, status)
VALUES (auth.uid(), 'Test Listing for Deletion', 'Test description', 'Test Collection', 'active')
RETURNING id;

-- Note the ID (let's say it's 999)

-- Now delete it
SELECT delete_listing(999);

-- Expected response (JSONB):
-- {
--   "success": true,
--   "deleted_at": "2025-12-04T...",
--   "permanent_deletion_at": "2026-03-04T...",
--   "retention_days": 90,
--   "can_recover": false,
--   "message": "Listing deleted..."
-- }

-- Verify listing is marked as deleted
SELECT id, title, deleted_at, deleted_by, deletion_type, status
FROM trade_listings
WHERE id = 999;

-- Expected: deleted_at is set, deleted_by is your user ID, deletion_type = 'user', status = 'removed'

-- Verify it's in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'listing'
AND entity_id = '999';

-- Expected: Row exists with scheduled_for = NOW() + 90 days

-- Clean up (for now)
DELETE FROM retention_schedule WHERE entity_id = '999';
DELETE FROM trade_listings WHERE id = 999;
```

**✅ Pass criteria**:
- Function returns success response
- Listing marked as deleted
- Row added to retention_schedule
- scheduled_for is 90 days in future

### Test 3: Test delete_template Function

```sql
-- Create a test template
INSERT INTO collection_templates (author_id, title, description, is_public, rating_avg, rating_count)
VALUES (auth.uid(), 'Test Template', 'Test description', false, 0.0, 0)
RETURNING id;

-- Note the ID (let's say it's 888)

-- Delete it
SELECT delete_template(888);

-- Verify template is marked as deleted
SELECT id, title, deleted_at, deleted_by, deletion_type, is_public
FROM collection_templates
WHERE id = 888;

-- Verify in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'template'
AND entity_id = '888';

-- Clean up
DELETE FROM retention_schedule WHERE entity_id = '888';
DELETE FROM collection_templates WHERE id = 888;
```

**✅ Pass criteria**: Same as delete_listing

### Test 4: Test delete_template with High Rating (Archive Test)

```sql
-- Create a highly-rated public template
INSERT INTO collection_templates (
    author_id,
    title,
    description,
    is_public,
    rating_avg,
    rating_count
)
VALUES (
    auth.uid(),
    'Highly Rated Template',
    'Test description',
    true,
    4.5,  -- High rating
    15    -- Enough ratings
)
RETURNING id;

-- Note the ID (let's say it's 777)

-- Try to delete it
SELECT delete_template(777);

-- Expected response:
-- {
--   "success": true,
--   "archived": true,
--   "message": "Template is highly rated and will remain public..."
-- }

-- Verify template is NOT marked for deletion
SELECT id, title, author_id, is_public
FROM collection_templates
WHERE id = 777;

-- Expected: author_id is NULL (anonymized), is_public is still TRUE, deleted_at is NULL

-- Verify NOT in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'template'
AND entity_id = '777';

-- Expected: No rows

-- Clean up
DELETE FROM collection_templates WHERE id = 777;
```

**✅ Pass criteria**: Template archived (author anonymized) but not deleted

### Test 5: Test delete_account Function

```sql
-- IMPORTANT: Do this with a test account, not your main account!

-- Delete account
SELECT delete_account();

-- Verify profile is marked as deleted and suspended
SELECT id, nickname, deleted_at, is_suspended, deletion_reason
FROM profiles
WHERE id = auth.uid();

-- Expected: deleted_at is set, is_suspended = true, deletion_reason = 'user_requested'

-- Verify in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'user'
AND entity_id = auth.uid()::TEXT;

-- Expected: Row exists with scheduled_for = NOW() + 90 days

-- Verify all user's listings are marked as deleted
SELECT id, title, deleted_at, status
FROM trade_listings
WHERE user_id = auth.uid();

-- Expected: All have deleted_at set and status = 'removed'

-- Verify messages are scheduled for deletion (180 days)
SELECT *
FROM retention_schedule
WHERE entity_type = 'message'
AND entity_id IN (
    SELECT id::TEXT FROM trade_chats
    WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- Expected: One row per message with scheduled_for = NOW() + 180 days
```

**✅ Pass criteria**:
- Profile marked as deleted and suspended
- All listings marked as deleted
- User added to retention schedule (90 days)
- Messages added to retention schedule (180 days)

### Test 6: Test cancel_account_deletion Function

```sql
-- After deleting account (from Test 5), try to cancel

-- First verify you can still authenticate (profile is not actually deleted yet)
SELECT auth.uid();

-- Cancel deletion
SELECT cancel_account_deletion();

-- Verify profile is restored
SELECT id, nickname, deleted_at, is_suspended
FROM profiles
WHERE id = auth.uid();

-- Expected: deleted_at = NULL, is_suspended = false

-- Verify removed from retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'user'
AND entity_id = auth.uid()::TEXT;

-- Expected: No rows

-- Verify listings are restored
SELECT id, title, deleted_at, status
FROM trade_listings
WHERE user_id = auth.uid();

-- Expected: All have deleted_at = NULL, status = 'active'
```

**✅ Pass criteria**: Everything restored successfully

### Test 7: Test Permission Checks

```sql
-- Try to delete someone else's listing (should fail)
-- First, find a listing that's not yours
SELECT id, user_id
FROM trade_listings
WHERE user_id != auth.uid()
LIMIT 1;

-- Try to delete it (let's say ID is 123)
SELECT delete_listing(123);

-- Expected: ERROR - Permission denied

-- Try to delete non-existent listing (should fail)
SELECT delete_listing(999999);

-- Expected: ERROR - Listing not found
```

**✅ Pass criteria**: Permission checks work

---

## Phase 3: Admin Functions - Manual Validation

**After applying migration `20251204000002_create_admin_deletion_functions.sql`:**

### Test 1: Verify Admin Functions Created

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'admin_suspend_account',
    'admin_delete_listing',
    'admin_delete_template',
    'admin_unsuspend_account'
)
AND routine_schema = 'public';

-- Expected: 4 functions
```

**✅ Pass criteria**: All 4 admin functions exist

### Test 2: Test admin_suspend_account (Non-Admin User)

```sql
-- Try to suspend someone as non-admin (should fail)
-- First ensure you're NOT an admin
SELECT is_admin FROM profiles WHERE id = auth.uid();

-- Try to suspend someone
SELECT admin_suspend_account(
    'some-user-uuid'::UUID,
    'Test suspension',
    true
);

-- Expected: ERROR - Admin access required
```

**✅ Pass criteria**: Non-admins cannot use admin functions

### Test 3: Test admin_suspend_account (As Admin)

```sql
-- Make yourself an admin temporarily for testing
UPDATE profiles SET is_admin = true WHERE id = auth.uid();

-- Create a test user account (or use existing test account UUID)
-- Let's say test user ID is 'test-user-uuid'

-- Suspend the account with deletion scheduling
SELECT admin_suspend_account(
    'test-user-uuid'::UUID,
    'Violating community guidelines',
    true  -- Schedule for deletion
);

-- Verify the user is suspended
SELECT
    id,
    nickname,
    suspended_at,
    suspended_by,
    suspension_reason,
    is_suspended,
    deleted_at
FROM profiles
WHERE id = 'test-user-uuid'::UUID;

-- Expected: suspended_at is set, suspended_by is your ID, is_suspended = true, deleted_at is set

-- Verify in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'user'
AND entity_id = 'test-user-uuid';

-- Expected: Row exists with scheduled_for = NOW() + 90 days

-- Verify audit log
SELECT *
FROM audit_log
WHERE moderation_action_type = 'suspend_user'
ORDER BY occurred_at DESC
LIMIT 1;

-- Expected: Log entry for the suspension
```

**✅ Pass criteria**:
- User suspended
- Scheduled for deletion
- Audit log created

### Test 4: Test admin_delete_listing

```sql
-- Create a test listing (or use existing)
-- Let's say listing ID is 456

-- Delete it as admin
SELECT admin_delete_listing(
    456,
    'Fraudulent listing - fake product'
);

-- Verify listing is marked as deleted
SELECT
    id,
    title,
    deleted_at,
    deleted_by,
    deletion_type,
    status
FROM trade_listings
WHERE id = 456;

-- Expected: deleted_at is set, deleted_by is your ID, deletion_type = 'admin', status = 'removed'

-- Verify in retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'listing'
AND entity_id = '456';

-- Verify audit log
SELECT *
FROM audit_log
WHERE moderation_action_type = 'delete_listing'
AND moderated_entity_id = 456
ORDER BY occurred_at DESC
LIMIT 1;
```

**✅ Pass criteria**: Listing deleted and logged

### Test 5: Test admin_delete_template

```sql
-- Similar to admin_delete_listing
SELECT admin_delete_template(
    789,
    'Copyright violation'
);

-- Verify deletion and audit log
SELECT * FROM collection_templates WHERE id = 789;
SELECT * FROM retention_schedule WHERE entity_type = 'template' AND entity_id = '789';
SELECT * FROM audit_log WHERE moderated_entity_id = 789 ORDER BY occurred_at DESC LIMIT 1;
```

**✅ Pass criteria**: Template deleted and logged

### Test 6: Test admin_unsuspend_account

```sql
-- Unsuspend the user from Test 3
SELECT admin_unsuspend_account(
    'test-user-uuid'::UUID,
    'Appeal granted - mistake'
);

-- Verify user is unsuspended
SELECT
    id,
    nickname,
    suspended_at,
    is_suspended,
    deleted_at
FROM profiles
WHERE id = 'test-user-uuid'::UUID;

-- Expected: suspended_at = NULL, is_suspended = false, deleted_at = NULL

-- Verify removed from retention schedule
SELECT *
FROM retention_schedule
WHERE entity_type = 'user'
AND entity_id = 'test-user-uuid';

-- Expected: No rows

-- Verify audit log
SELECT *
FROM audit_log
WHERE moderation_action_type = 'unsuspend_user'
ORDER BY occurred_at DESC
LIMIT 1;
```

**✅ Pass criteria**: User unsuspended and unscheduled

### Test 7: Clean Up Admin Status

```sql
-- Remove admin status from your test account
UPDATE profiles SET is_admin = false WHERE id = auth.uid();
```

---

## Phase 4: Cleanup Job - Manual Validation

**After applying migration `20251204000003_create_cleanup_and_monitoring.sql`:**

### Test 1: Verify Cleanup Function Created

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'process_retention_schedule'
AND routine_schema = 'public';
```

**✅ Pass criteria**: Function exists

### Test 2: Verify Cron Jobs Created

```sql
-- Check cron extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Expected: One row

-- Check scheduled jobs
SELECT
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname LIKE '%retention%';

-- Expected: At least 1 job (process-data-retention)
```

**✅ Pass criteria**: Cron job(s) created and active

### Test 3: Manual Cleanup Job Execution

```sql
-- First, create a test item that should be deleted immediately
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason
)
VALUES (
    'notification',
    '12345',
    'delete',
    NOW() - INTERVAL '1 day',  -- Already expired!
    'test_manual_cleanup'
);

-- Create a corresponding notification (if needed)
-- Or just test with a notification ID that doesn't exist (it should handle gracefully)

-- Run the cleanup job manually
SELECT * FROM process_retention_schedule();

-- Expected: Returns table with counts of processed items

-- Verify the test item was marked as processed
SELECT *
FROM retention_schedule
WHERE entity_id = '12345';

-- Expected: processed_at is set
```

**✅ Pass criteria**: Job runs without errors, test item processed

### Test 4: Test Legal Hold Prevents Deletion

```sql
-- Create a test item with legal hold
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason,
    legal_hold_until
)
VALUES (
    'listing',
    '99999',
    'delete',
    NOW() - INTERVAL '1 day',  -- Should be deleted
    'test_legal_hold',
    NOW() + INTERVAL '1 year'  -- But legal hold prevents it
);

-- Run cleanup
SELECT * FROM process_retention_schedule();

-- Verify item was NOT processed
SELECT *
FROM retention_schedule
WHERE entity_id = '99999';

-- Expected: processed_at is NULL (not processed due to legal hold)

-- Clean up
DELETE FROM retention_schedule WHERE entity_id = '99999';
```

**✅ Pass criteria**: Legal hold prevents deletion

### Test 5: Test Auto-Schedule Functions

```sql
-- Verify auto-schedule functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'auto_schedule%';

-- Expected: auto_schedule_old_notifications, auto_schedule_old_reports, auto_schedule_old_ratings

-- Test auto_schedule_old_notifications
-- First, create an old read notification
INSERT INTO notifications (user_id, kind, created_at, read_at)
VALUES (
    auth.uid(),
    'listing_chat',
    NOW() - INTERVAL '35 days',  -- Older than 30 days
    NOW() - INTERVAL '35 days'   -- Was read
);
-- Note the ID

-- Run auto-schedule
SELECT auto_schedule_old_notifications();

-- Check if notification was scheduled
SELECT *
FROM retention_schedule
WHERE entity_type = 'notification'
AND entity_id IN (
    SELECT id::TEXT FROM notifications
    WHERE read_at < NOW() - INTERVAL '30 days'
);

-- Expected: Notification scheduled for deletion
```

**✅ Pass criteria**: Auto-schedule functions work

### Test 6: Test Monitoring Functions

```sql
-- Test admin_get_retention_stats
SELECT * FROM admin_get_retention_stats();

-- Expected: JSONB with keys: pending_deletions, pending_anonymizations, legal_holds, next_deletion, by_entity_type, processed_today

-- Test admin_get_retention_queue
SELECT * FROM admin_get_retention_queue(10, 0);

-- Expected: Table with pending items

-- Test get_user_deletion_status (for your user)
SELECT * FROM get_user_deletion_status();

-- Expected: JSONB indicating if your account is scheduled for deletion
```

**✅ Pass criteria**: All monitoring functions return data

---

## Phase 5: Email Notifications - Manual Validation

**After applying email notification migration:**

### Test 1: Verify Email Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'pending_emails';

-- Expected: Table exists

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'pending_emails';

-- Expected: All email columns present
```

### Test 2: Test schedule_email Function

```sql
-- Schedule a test email
SELECT schedule_email(
    'test@example.com',
    'test_template',
    '{"test_data": "hello"}'::jsonb,
    NOW()
);

-- Check it was created
SELECT *
FROM pending_emails
WHERE recipient_email = 'test@example.com';

-- Clean up
DELETE FROM pending_emails WHERE recipient_email = 'test@example.com';
```

**✅ Pass criteria**: Email scheduled successfully

### Test 3: Test send_deletion_warnings Function

```sql
-- First, create a test user scheduled for deletion in 7 days
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason
)
VALUES (
    'user',
    auth.uid()::TEXT,
    'delete',
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'test_7day_warning'
);

-- Run warning function
SELECT send_deletion_warnings();

-- Check if email was scheduled
SELECT *
FROM pending_emails
WHERE template_name = 'deletion_warning_7_days';

-- Clean up
DELETE FROM retention_schedule WHERE reason = 'test_7day_warning';
DELETE FROM pending_emails WHERE template_name = 'deletion_warning_7_days';
```

**✅ Pass criteria**: Warning email scheduled

---

## Phase 6: RLS Policies - Manual Validation

**After applying RLS policy updates:**

### Test 1: Test Public Cannot See Deleted Listings

```sql
-- As admin or owner, create and delete a test listing
INSERT INTO trade_listings (user_id, title, status)
VALUES (auth.uid(), 'Test Listing', 'active')
RETURNING id;

-- Let's say ID is 111

-- Delete it
UPDATE trade_listings SET deleted_at = NOW() WHERE id = 111;

-- Now try to query it as public (use a different session or log out)
-- Or use this trick to simulate public access
SET ROLE anon;

SELECT * FROM trade_listings WHERE id = 111;

-- Expected: No rows (public can't see deleted listings)

RESET ROLE;

-- But as owner, you can still see it
SELECT * FROM trade_listings WHERE id = 111;

-- Expected: One row

-- Clean up
DELETE FROM trade_listings WHERE id = 111;
```

**✅ Pass criteria**: RLS hides deleted items from public

### Test 2: Test Same for Templates

```sql
-- Similar test for collection_templates
INSERT INTO collection_templates (author_id, title, is_public)
VALUES (auth.uid(), 'Test Template', true)
RETURNING id;

-- Delete it
UPDATE collection_templates SET deleted_at = NOW() WHERE id = <returned_id>;

-- Test public access
SET ROLE anon;
SELECT * FROM collection_templates WHERE id = <returned_id>;
-- Expected: No rows

RESET ROLE;

-- Test as author
SELECT * FROM collection_templates WHERE id = <returned_id>;
-- Expected: One row

-- Clean up
DELETE FROM collection_templates WHERE id = <returned_id>;
```

**✅ Pass criteria**: Same behavior for templates

---

## End-to-End Tests (After All Phases Complete)

### E2E Test 1: Complete User Deletion Flow

```bash
1. Create new test account
2. Create 3 listings
3. Create 2 templates
4. Send some messages
5. Request account deletion
6. Verify:
   - Account suspended (can't log in normally)
   - All listings marked deleted
   - Templates marked deleted
   - Everything scheduled in retention_schedule
7. Log back in (special recovery mode)
8. See deletion banner with countdown
9. Cancel deletion
10. Verify everything restored
11. Request deletion again
12. Don't cancel
13. Fast-forward scheduled_for to NOW() in database
14. Run cleanup job
15. Verify account permanently deleted
```

### E2E Test 2: Admin Suspension Flow

```bash
1. Admin suspends user account with deletion schedule
2. User tries to log in (should fail or see suspended message)
3. User's content hidden from public
4. Admin reviews suspension
5. Admin unsuspends user
6. User can log in again
7. Content visible again
```

### E2E Test 3: Legal Hold Flow

```bash
1. Schedule something for deletion
2. Apply legal hold
3. Run cleanup job
4. Verify not deleted
5. Release legal hold
6. Run cleanup job again
7. Verify now deleted
```

---

## Monitoring Commands (Use Daily After Launch)

```sql
-- 1. Check if cron job ran today
SELECT *
FROM cron.job_run_details
WHERE jobname = 'process-data-retention'
AND start_time >= CURRENT_DATE
ORDER BY start_time DESC
LIMIT 1;

-- 2. Check for failed cron jobs
SELECT *
FROM cron.job_run_details
WHERE jobname = 'process-data-retention'
AND status = 'failed'
ORDER BY start_time DESC
LIMIT 5;

-- 3. Count items pending deletion
SELECT
    entity_type,
    COUNT(*) as pending_count
FROM retention_schedule
WHERE processed_at IS NULL
GROUP BY entity_type;

-- 4. Next scheduled deletions
SELECT
    entity_type,
    entity_id,
    scheduled_for,
    reason
FROM retention_schedule
WHERE processed_at IS NULL
ORDER BY scheduled_for ASC
LIMIT 10;

-- 5. Items deleted today
SELECT COUNT(*)
FROM retention_schedule
WHERE processed_at >= CURRENT_DATE;

-- 6. Legal holds in effect
SELECT COUNT(*)
FROM retention_schedule
WHERE legal_hold_until IS NOT NULL
AND legal_hold_until > NOW();
```

---

## Troubleshooting

### Problem: Cron Job Not Running

```sql
-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'process-data-retention';

-- Check if pg_cron extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check recent runs
SELECT *
FROM cron.job_run_details
WHERE jobname = 'process-data-retention'
ORDER BY start_time DESC
LIMIT 10;

-- Re-create job if needed
SELECT cron.unschedule('process-data-retention');
SELECT cron.schedule(
    'process-data-retention',
    '0 2 * * *',
    $$SELECT process_retention_schedule()$$
);
```

### Problem: Items Not Being Deleted

```sql
-- Check for legal holds
SELECT *
FROM retention_schedule
WHERE processed_at IS NULL
AND legal_hold_until IS NOT NULL;

-- Check for errors in cleanup function
-- Run manually and watch for errors
SELECT * FROM process_retention_schedule();

-- Check if scheduled_for is in the past
SELECT *
FROM retention_schedule
WHERE processed_at IS NULL
AND scheduled_for > NOW();
-- If many rows, they're not due yet
```

---

Use these validation steps at each phase. Don't skip phases - each builds on the previous one!
