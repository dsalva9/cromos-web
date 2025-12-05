# Data Retention Quick Start Guide

**For Pre-Launch Implementation**

Since you're not live yet, we can skip all the migration complexity and implement a clean retention system from scratch.

---

## What Changed?

### OLD Plan (for live systems)
- ❌ 10 weeks
- ❌ Complex soft deletion + grace periods
- ❌ Backwards compatibility
- ❌ Data migration

### NEW Plan (pre-launch)
- ✅ **2-3 weeks**
- ✅ Clean schema from the start
- ✅ Centralized retention system
- ✅ No migration baggage

---

## Core Architecture

### Single Source of Truth

Everything scheduled for deletion goes in **one table**:

```sql
retention_schedule
├── entity_type  (listing, template, user, message, etc.)
├── entity_id    (the ID of the thing to delete)
├── action       (delete or anonymize)
├── scheduled_for (when to process it)
├── legal_hold_until (prevents deletion if set)
└── processed_at (null until done)
```

### How It Works

1. **User deletes something** → `schedule_deletion('listing', '123', 90, 'user_deleted')`
2. **Row added to schedule** → Will be deleted in 90 days
3. **Daily cron job runs** → `process_retention_schedule()` at 02:00 UTC
4. **Job processes schedule** → Deletes items where `scheduled_for <= NOW()`
5. **Legal holds respected** → Items with `legal_hold_until` are skipped

---

## Implementation Steps

### Week 1: Core System

**Day 1-2**: Create retention infrastructure
```bash
# Run migration
supabase migration new create_retention_system

# Copy SQL from Phase 1 in implementation doc
# Creates retention_schedule table
```

**Day 3-4**: Add deletion functions
```bash
# Run migration
supabase migration new create_deletion_functions

# Adds:
# - delete_listing()
# - delete_template()
# - delete_account()
# - schedule_deletion()
```

**Day 4-5**: Set up automated cleanup
```bash
# Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

# Schedule daily job
SELECT cron.schedule(
    'process-data-retention',
    '0 2 * * *',
    $$SELECT process_retention_schedule()$$
);
```

### Week 2: Admin & Polish

**Day 1-2**: Legal hold system
```sql
-- Functions for court orders
apply_legal_hold(entity_type, entity_id, hold_until, case_ref)
release_legal_hold(entity_type, entity_id, reason)
```

**Day 3-4**: Admin dashboard
```sql
-- View retention stats
admin_get_retention_stats()
admin_get_retention_queue()
```

**Day 5**: Update UI
- Hide deleted items from public view (RLS policies)
- Show deletion countdown to users
- Add "Delete Account" button

### Week 3: Testing

- Test all deletion flows
- Verify cron job runs
- Check legal holds work
- Load test with 1000s of scheduled deletions

---

## Files to Create

All migrations go in `supabase/migrations/`:

```
20251204000000_create_retention_system.sql
20251204000001_create_deletion_functions.sql
20251204000002_create_cleanup_job.sql
20251204000003_create_legal_hold_system.sql
20251204000004_create_admin_retention_rpcs.sql
20251204000005_update_rls_policies.sql
```

Full SQL provided in: `docs/guides/DATA_RETENTION_IMPLEMENTATION_V2.md`

---

## Key Functions to Use

### User Actions

```sql
-- Delete listing (90 day retention)
SELECT delete_listing(123);

-- Delete template (90 day retention)
SELECT delete_template(456);

-- Delete account (90 day retention, messages 180 days)
SELECT delete_account();
```

### Admin Actions

```sql
-- Apply legal hold
SELECT apply_legal_hold(
    'user',
    'user-uuid-here',
    NOW() + INTERVAL '6 months',
    'CASE-2025-001'
);

-- Release legal hold
SELECT release_legal_hold('user', 'user-uuid-here', 'Case closed');

-- View retention dashboard
SELECT * FROM admin_get_retention_stats();

-- View deletion queue
SELECT * FROM admin_get_retention_queue(50, 0);
```

### Monitoring

```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'process-data-retention';

-- See what's scheduled for deletion
SELECT * FROM retention_schedule WHERE processed_at IS NULL;

-- See items under legal hold
SELECT * FROM retention_schedule WHERE legal_hold_until IS NOT NULL;
```

---

## Decision Points

Before you start, decide:

### 1. Soft Delete UX?

**Option A: Immediate UI deletion**
- User deletes → item disappears from UI immediately
- Still in database for 90 days
- Simpler UX

**Option B: "Deleted" state visible**
- User deletes → item marked "Deleted, will be removed in X days"
- User can see countdown
- More transparent but more complex

**Recommendation**: Option A (simpler)

### 2. Account Deletion Recovery?

**Option A: No recovery**
- User deletes account → that's it, can't cancel
- Data deleted after 90 days
- Simpler

**Option B: Recovery within grace period**
- User can log back in within 90 days to cancel deletion
- Requires additional function: `cancel_account_deletion()`

**Recommendation**: Option B (better UX, minimal complexity)

### 3. Pre-deletion Notifications?

Should users get emails before permanent deletion?

**Suggestion**: Yes
- 7 days before: "Your account will be permanently deleted in 7 days"
- 3 days before: "Final warning - 3 days remaining"
- 1 day before: "Last chance - account deleted tomorrow"

Implement this as:
```sql
-- Add to cron jobs
SELECT cron.schedule(
    'send-deletion-warnings',
    '0 12 * * *',  -- Daily at noon
    $$SELECT send_deletion_warnings()$$
);
```

---

## Testing Checklist

Before launch:

- [ ] Delete a test listing → verify it's scheduled
- [ ] Wait or manually set `scheduled_for = NOW()` → run job → verify deleted
- [ ] Apply legal hold → run job → verify NOT deleted
- [ ] Release legal hold → run job → verify deleted
- [ ] Delete test account → verify all user content scheduled
- [ ] Check cron job runs daily: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
- [ ] Load test: Schedule 1000 deletions → run job → verify performance
- [ ] Admin dashboard shows correct counts
- [ ] Audit log captures all deletions

---

## Launch Checklist

**Before going live:**

- [ ] All migrations applied to production
- [ ] pg_cron extension enabled
- [ ] Cron job created and active
- [ ] Privacy policy updated with retention periods
- [ ] Terms of Service updated
- [ ] User deletion UI implemented
- [ ] Admin dashboard shows retention stats
- [ ] Legal hold procedure documented for legal team

**Day 1:**

- [ ] Monitor first cron job execution
- [ ] Check for errors: `SELECT * FROM cron.job_run_details WHERE status = 'failed';`
- [ ] Verify deletions are logging to audit_log

**Week 1:**

- [ ] Daily check: Is cron running?
- [ ] Test user deletion flow end-to-end
- [ ] Check retention queue isn't growing unexpectedly

---

## Monitoring

### Daily (first 30 days)

```sql
-- Did the job run?
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-data-retention'
ORDER BY start_time DESC LIMIT 1;

-- What's in the queue?
SELECT entity_type, COUNT(*)
FROM retention_schedule
WHERE processed_at IS NULL
GROUP BY entity_type;

-- Any legal holds?
SELECT COUNT(*) FROM retention_schedule WHERE legal_hold_until IS NOT NULL;
```

### Weekly

```sql
-- Full stats
SELECT * FROM admin_get_retention_stats();

-- Processed this week
SELECT entity_type, COUNT(*)
FROM retention_schedule
WHERE processed_at >= NOW() - INTERVAL '7 days'
GROUP BY entity_type;
```

### Monthly

- Full compliance audit
- Review any failed deletions
- Check audit log completeness

---

## Cost

**Development**: 2-3 weeks

**Supabase**:
- Storage: +~5% (retention_schedule table is small)
- Compute: Negligible (one short job per day)
- pg_cron: Included in Pro plan ($25/mo)

**Ongoing**: ~1 hour/month monitoring

---

## Emergency Procedures

### Cron Job Stops Running

```sql
-- Check job exists
SELECT * FROM cron.job WHERE jobname = 'process-data-retention';

-- Check recent runs
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-data-retention'
ORDER BY start_time DESC LIMIT 10;

-- Re-create if missing
SELECT cron.unschedule('process-data-retention');
SELECT cron.schedule(
    'process-data-retention',
    '0 2 * * *',
    $$SELECT process_retention_schedule()$$
);
```

### Accidental Deletion Scheduled

```sql
-- Apply legal hold immediately to prevent deletion
SELECT apply_legal_hold(
    'listing',  -- or 'user', 'template', etc.
    '123',
    NOW() + INTERVAL '1 year',
    'EMERGENCY HOLD - investigating incident'
);

-- Or remove from schedule entirely
DELETE FROM retention_schedule
WHERE entity_type = 'listing'
AND entity_id = '123';
```

### Need to Restore Deleted Data

If within backup retention (12 months):
1. Contact Supabase support for point-in-time restore
2. Identify backup containing the data
3. Restore to new project
4. Export data
5. Import to production

**Prevention**: This is why we have 90-day retention!

---

## Next Steps

1. **Review the full implementation**: Read `DATA_RETENTION_IMPLEMENTATION_V2.md`
2. **Make decisions**: Answer the 3 decision points above
3. **Create migrations**: Use the SQL from Phase 1-6
4. **Test locally**: Run through all test scenarios
5. **Deploy to staging**: Full end-to-end test
6. **Go live**: Launch with monitoring

---

## Questions?

Let me know if you need:
- Account deletion recovery function
- Pre-deletion email notifications
- Different retention periods
- Additional entity types to track
- Help with the migrations

Ready to start implementation whenever you are!
