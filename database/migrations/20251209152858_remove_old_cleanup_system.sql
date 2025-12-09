-- =====================================================
-- Migration: Remove old 30-day cleanup system
-- Created: 2025-12-09
-- Description: Removes the old cleanup_old_eliminado_listings system
--              which conflicts with the new 90-day retention system.
--              Keeps restore_listing function as it's still useful.
-- =====================================================

-- 1. Unschedule the old cron job
SELECT cron.unschedule('cleanup-eliminado-listings');

-- 2. Drop the old cleanup function
DROP FUNCTION IF EXISTS cleanup_old_eliminado_listings();

-- =====================================================
-- NOTES:
-- - The restore_listing() function is kept (not removed)
-- - The new retention system handles all cleanup via:
--   * process_retention_schedule() function
--   * process-retention-schedule cron job @ 2 AM UTC
--   * 90-day retention period (not 30 days)
-- =====================================================
