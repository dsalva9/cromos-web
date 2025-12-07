# Validation Tests: Phases 4-6 (Cleanup, Email, RLS)

## Phase 4: Cleanup Job Testing

### Test 1: Verify pg_cron extension and jobs
```sql
-- Check pg_cron extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- Expected: 1 row with extname = 'pg_cron'

-- View scheduled cron jobs
SELECT * FROM cron.job;
-- Expected: 2 rows
-- - 'process-retention-schedule' (runs at 3 AM UTC)
-- - 'send-deletion-warnings' (runs at 12 PM UTC)
```

### Test 2: Verify process_retention_schedule function
```sql
-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'process_retention_schedule';
-- Expected: 1 row

-- Manually run the cleanup (safe - won't delete anything not past retention)
SELECT process_retention_schedule();
-- Expected: {"success": true, "processed_count": 0, ...}
-- (processed_count = 0 because no items are past 90 days yet)
```

### Test 3: Test cleanup with past-dated item (SAFE TEST)
```sql
-- Create a test listing and immediately mark for deletion in the past
-- (This won't affect real data)

-- 1. Create test listing
INSERT INTO trade_listings (user_id, title, status, deleted_at)
VALUES (
    auth.uid(),
    'TEST - To be deleted',
    'ELIMINADO',
    NOW() - INTERVAL '91 days'  -- Deleted 91 days ago
)
RETURNING id;
-- Note the ID (e.g., 999)

-- 2. Schedule it for deletion (already past due date)
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason,
    initiated_by_type
) VALUES (
    'listing',
    '999',  -- Use ID from step 1
    'delete',
    NOW() - INTERVAL '1 day',  -- Past due!
    'test_cleanup',
    'system'
);

-- 3. Run cleanup
SELECT process_retention_schedule();
-- Expected: {"success": true, "processed_count": 1, ...}

-- 4. Verify listing was deleted
SELECT * FROM trade_listings WHERE id = 999;
-- Expected: No rows (permanently deleted)

-- 5. Verify retention schedule marked as processed
SELECT processed_at FROM retention_schedule
WHERE entity_id = '999';
-- Expected: Timestamp (marked as processed)

-- CLEANUP: Remove test retention schedule
DELETE FROM retention_schedule WHERE entity_id = '999';
```

**✅ Pass Criteria:**
- pg_cron extension enabled
- 2 cron jobs scheduled
- process_retention_schedule function executes without errors
- Past-due items are permanently deleted
- Retention schedule marked as processed

---

## Phase 5: Email System Testing

### Test 1: Verify email functions
```sql
-- Check schedule_email function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'schedule_email';
-- Expected: 1 row

-- Check send_deletion_warnings function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'send_deletion_warnings';
-- Expected: 1 row
```

### Test 2: Test schedule_email function
```sql
-- Queue a test email
SELECT schedule_email(
    'test@example.com',
    'test_template',
    '{"test": "data"}'::jsonb
);
-- Expected: Returns email ID (e.g., 123)

-- Verify email was queued
SELECT * FROM pending_emails
WHERE recipient_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: 1 row with template_name = 'test_template'

-- CLEANUP: Remove test email
DELETE FROM pending_emails
WHERE recipient_email = 'test@example.com';
```

### Test 3: Test send_deletion_warnings function
```sql
-- Run the warning sender (safe - won't send if no users are 7/3/1 days away)
SELECT send_deletion_warnings();
-- Expected: {
--   "success": true,
--   "warnings_7day": 0,
--   "warnings_3day": 0,
--   "warnings_1day": 0,
--   "total_warnings": 0,
--   ...
-- }
```

### Test 4: Test deletion warnings with mock data
```sql
-- Create a test user deletion scheduled for 7 days from now
-- (Only for testing - this simulates a user who deleted their account)

-- 1. Schedule a user deletion for 7 days from now (user-initiated)
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason,
    initiated_by_type
) VALUES (
    'user',
    auth.uid()::TEXT,  -- Your own user ID
    'delete',
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'user_requested',  -- Important: must be user_requested for warnings
    'user'
);

-- 2. Run warning sender
SELECT send_deletion_warnings();
-- Expected: warnings_7day = 1

-- 3. Verify email was queued
SELECT * FROM pending_emails
WHERE template_name = 'deletion_warning_7_days'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: 1 row with your email

-- CLEANUP: Remove test data
DELETE FROM retention_schedule
WHERE entity_id = auth.uid()::TEXT;

DELETE FROM pending_emails
WHERE template_name LIKE 'deletion_warning%';
```

**✅ Pass Criteria:**
- schedule_email queues emails successfully
- send_deletion_warnings runs without errors
- Warnings only sent for user_requested deletions (not admin_suspended)
- Emails queued in pending_emails table
- Duplicate warnings prevented

---

## Phase 6: RLS Policy Testing

### Test 1: Verify check_user_visibility function
```sql
-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'check_user_visibility';
-- Expected: 1 row

-- Test with active user (should be visible)
SELECT check_user_visibility(auth.uid());
-- Expected: true

-- Test with non-existent user
SELECT check_user_visibility('00000000-0000-0000-0000-000000000000'::uuid);
-- Expected: false
```

### Test 2: Test suspended user visibility (FROM FRONTEND)
**Use the Retention Test page at `/admin/retention-test`**

1. **Suspend a test user**
   - Enter user UUID: `63481992-a418-4bf6-9cdc-8291e8b22825` (or another test user)
   - Enter reason: "Testing RLS policies"
   - Click "Suspend"

2. **Open a new incognito window (as non-admin)**
   - Navigate to the user's profile page
   - **Expected**: 404 or "User not found" (user is hidden)

3. **Check user's listings**
   - Navigate to marketplace
   - **Expected**: Suspended user's listings are hidden from search

4. **As admin, verify you CAN still see them**
   - In your admin window, navigate to `/admin/users`
   - **Expected**: You should see the suspended user with suspension indicator

5. **Unsuspend the user**
   - Click "Unsuspend" in the retention test page
   - **Expected**: User becomes visible again

### Test 3: Test deleted user visibility
```sql
-- Manually mark a test user as deleted (simulate user deletion)
UPDATE profiles
SET deleted_at = NOW()
WHERE id = '63481992-a418-4bf6-9cdc-8291e8b22825';

-- As non-admin, try to view their profile (run in app, not SQL)
-- Expected: User not visible

-- Check their listings are hidden
SELECT count(*)
FROM trade_listings
WHERE user_id = '63481992-a418-4bf6-9cdc-8291e8b22825'
AND status = 'active'
AND check_user_visibility(user_id) = true;
-- Expected: 0 (hidden from non-admins)

-- As admin, you should still see them
-- (Make yourself admin first: UPDATE profiles SET is_admin = TRUE WHERE id = auth.uid())
SELECT *
FROM profiles
WHERE id = '63481992-a418-4bf6-9cdc-8291e8b22825';
-- Expected: 1 row (admins can see deleted users)

-- CLEANUP: Restore user
UPDATE profiles
SET deleted_at = NULL
WHERE id = '63481992-a418-4bf6-9cdc-8291e8b22825';
```

### Test 4: Test chat visibility with suspended users
```sql
-- This test requires chats involving the suspended user
-- Expected behavior:
-- - Non-admin: Cannot see chats with suspended/deleted users
-- - Admin: Can see all chats
-- - Suspended user themselves: Can still see their own chats (if they could log in, which they can't)
```

**✅ Pass Criteria:**
- check_user_visibility function works correctly
- Suspended users hidden from non-admins
- Deleted users hidden from non-admins
- Admins can see all users (with deletion indicators)
- Users can always see their own profile
- Listings/templates from deleted users are hidden
- Chats with deleted users are hidden

---

## Frontend Testing via `/admin/retention-test`

### Complete Workflow Test:

1. **Load Stats**
   - Click "Load Stats"
   - Note: pending_deletions, suspended_users counts

2. **Suspend User → Move to Deletion → Unsuspend**
   - Suspend user `63481992-a418-4bf6-9cdc-8291e8b22825`
   - Check stats: suspended_users should increase by 1
   - Click "Move to Deletion"
   - Check stats: pending_deletions should increase by 1
   - Open incognito window: user should be invisible
   - Click "Unsuspend"
   - Check stats: both counts should decrease
   - Refresh incognito: user should be visible again

3. **Delete Listing**
   - Find a test listing ID
   - Delete with reason "Testing retention"
   - Check stats: deleted_listings should increase by 1
   - View marketplace: listing should be hidden

4. **Delete Template**
   - Find a test template ID
   - Delete with reason "Testing retention"
   - Check stats: deleted_templates should increase by 1
   - View templates: template should be hidden
   - Verify user albums (copies) still exist

5. **Check Email Queue**
```sql
SELECT
    template_name,
    recipient_email,
    template_data->>'nickname' as nickname,
    created_at
FROM pending_emails
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
-- Expected: Suspension emails queued
```

6. **Manually Run Cleanup (Safe)**
```sql
SELECT process_retention_schedule();
-- Expected: {"success": true, "processed_count": 0}
-- (Nothing to process yet - all items are within 90 days)
```

---

## Summary Checklist

### Phase 4 - Cleanup Job ✅
- [ ] pg_cron extension enabled
- [ ] 2 cron jobs scheduled (cleanup + email warnings)
- [ ] process_retention_schedule function works
- [ ] Deletes items past retention period
- [ ] Respects legal holds
- [ ] Marks schedules as processed

### Phase 5 - Email System ✅
- [ ] schedule_email queues emails
- [ ] send_deletion_warnings runs daily
- [ ] 7/3/1 day warnings for user-initiated deletions only
- [ ] Admin-suspended users don't get warnings
- [ ] Duplicate warnings prevented
- [ ] pending_emails table populated correctly

### Phase 6 - RLS Policies ✅
- [ ] check_user_visibility function works
- [ ] Suspended users hidden from non-admins
- [ ] Deleted users hidden from non-admins
- [ ] Admins see everything
- [ ] Users see own content
- [ ] Listings from deleted users hidden
- [ ] Templates from deleted users hidden
- [ ] Chats with deleted users hidden
- [ ] Ratings from deleted users hidden

---

## Next Steps

Once all tests pass:
1. ✅ **Backend Complete**: Phases 1-6 done
2. **Frontend Components**: Phases 7-9 (user-facing UI for deletion)
3. **Email Templates**: Phase 10 (HTML email designs)
4. **Production Migration**: Deploy when ready

---

## Troubleshooting

### pg_cron not working?
```sql
-- Check if extension is in correct schema
SELECT extname, extnamespace::regnamespace
FROM pg_extension
WHERE extname = 'pg_cron';
-- Should be in 'extensions' schema

-- Check cron.job table access
SELECT * FROM cron.job;
```

### Emails not queuing?
```sql
-- Check pending_emails table exists
SELECT * FROM pending_emails LIMIT 1;

-- Check schedule_email function permissions
SELECT has_function_privilege('schedule_email(text, text, jsonb, timestamptz)', 'execute');
-- Expected: true
```

### RLS policies blocking too much?
```sql
-- Check your admin status
SELECT id, is_admin FROM profiles WHERE id = auth.uid();

-- Test visibility function directly
SELECT check_user_visibility('USER_UUID_HERE'::uuid);
```

---

**All phases tested? Great! The retention system is ready for production! 🎉**
