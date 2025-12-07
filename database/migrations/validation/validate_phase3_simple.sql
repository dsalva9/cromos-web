-- =====================================================
-- SIMPLE VALIDATION: Phase 3 - Admin Functions
-- =====================================================
-- Returns actual results visible in Supabase SQL Editor
-- Run each section separately to see results
-- =====================================================

-- SETUP: Make yourself admin first
-- UPDATE profiles SET is_admin = TRUE WHERE id = auth.uid();

-- =====================================================
-- TEST 1: Verify all functions exist
-- =====================================================
SELECT
    routine_name as function_name,
    'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'admin_suspend_account',
    'admin_move_to_deletion',
    'admin_unsuspend_account',
    'admin_delete_listing',
    'admin_delete_template',
    'admin_get_retention_stats'
)
ORDER BY routine_name;

-- =====================================================
-- TEST 2: Get current retention stats
-- =====================================================
-- First make yourself admin:
-- UPDATE profiles SET is_admin = TRUE WHERE id = auth.uid();

-- Then run:
SELECT admin_get_retention_stats() as stats;

-- =====================================================
-- TEST 3: Test suspend account workflow
-- =====================================================

-- Step 1: Find a test user (not yourself)
SELECT
    id as user_id,
    nickname,
    suspended_at,
    deleted_at
FROM profiles
WHERE id != auth.uid()
AND suspended_at IS NULL
AND deleted_at IS NULL
LIMIT 1;

-- Step 2: Suspend them (replace UUID with result from Step 1)
-- SELECT admin_suspend_account(
--     'USER_ID_HERE'::uuid,
--     'Test suspension - policy violation'
-- ) as result;

-- Step 3: Verify suspension worked
-- SELECT
--     id,
--     nickname,
--     suspended_at,
--     suspended_by,
--     suspension_reason
-- FROM profiles
-- WHERE id = 'USER_ID_HERE'::uuid;

-- Step 4: Check retention schedule (should be empty - not auto-scheduled)
-- SELECT * FROM retention_schedule
-- WHERE entity_type = 'user'
-- AND entity_id = 'USER_ID_HERE';

-- Step 5: Move to deletion queue
-- SELECT admin_move_to_deletion('USER_ID_HERE'::uuid) as result;

-- Step 6: Verify scheduled for deletion (should show 90 days from now)
-- SELECT
--     entity_type,
--     entity_id,
--     action,
--     scheduled_for,
--     reason,
--     initiated_by_type,
--     EXTRACT(DAY FROM (scheduled_for - NOW())) as days_until_deletion
-- FROM retention_schedule
-- WHERE entity_type = 'user'
-- AND entity_id = 'USER_ID_HERE';

-- Step 7: Unsuspend (cancels deletion)
-- SELECT admin_unsuspend_account('USER_ID_HERE'::uuid) as result;

-- Step 8: Verify unsuspended and deletion cancelled
-- SELECT
--     id,
--     nickname,
--     suspended_at,
--     'User unsuspended' as status
-- FROM profiles
-- WHERE id = 'USER_ID_HERE'::uuid;

-- SELECT
--     COUNT(*) as remaining_deletion_schedules
-- FROM retention_schedule
-- WHERE entity_type = 'user'
-- AND entity_id = 'USER_ID_HERE'
-- AND processed_at IS NULL;

-- =====================================================
-- TEST 4: Check audit log
-- =====================================================
-- View recent admin actions
SELECT
    moderation_action_type,
    moderated_entity_type,
    moderation_reason,
    created_at,
    after_json
FROM audit_log
WHERE moderation_action_type IN (
    'suspend_account',
    'move_to_deletion',
    'unsuspend_account',
    'delete_listing',
    'delete_template'
)
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- TEST 5: Check email queue
-- =====================================================
-- View queued suspension emails
SELECT
    recipient_email,
    template_name,
    template_data,
    scheduled_for,
    sent_at
FROM pending_emails
WHERE template_name = 'admin_suspension_notice'
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- CLEANUP: Remove test data if needed
-- =====================================================
-- Delete test emails
-- DELETE FROM pending_emails
-- WHERE template_name = 'admin_suspension_notice'
-- AND created_at > NOW() - INTERVAL '1 hour';

-- Delete test retention schedules
-- DELETE FROM retention_schedule
-- WHERE entity_type = 'user'
-- AND entity_id = 'USER_ID_HERE'
-- AND created_at > NOW() - INTERVAL '1 hour';
