-- =====================================================
-- PHASE 4: CLEANUP JOB WITH PG_CRON
-- =====================================================
-- Automated daily job to permanently delete entities
-- past their 90-day retention period
-- =====================================================

-- =====================================================
-- FUNCTION: process_retention_schedule
-- =====================================================
-- Processes all pending deletions that are ready to execute
-- Runs daily via pg_cron
CREATE OR REPLACE FUNCTION process_retention_schedule()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_item RECORD;
    v_delete_count INTEGER;
BEGIN
    -- Process all items scheduled for deletion that are ready
    FOR v_item IN
        SELECT *
        FROM retention_schedule
        WHERE processed_at IS NULL
        AND scheduled_for <= NOW()
        AND (legal_hold_until IS NULL OR legal_hold_until < NOW())
        ORDER BY scheduled_for ASC
    LOOP
        -- Execute deletion based on entity type
        CASE v_item.entity_type
            WHEN 'listing' THEN
                -- Permanently delete listing
                DELETE FROM trade_listings
                WHERE id = v_item.entity_id::BIGINT
                AND deleted_at IS NOT NULL;  -- Safety check

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            WHEN 'template' THEN
                -- Permanently delete template (albums are preserved via ON DELETE SET NULL)
                DELETE FROM collection_templates
                WHERE id = v_item.entity_id::BIGINT
                AND deleted_at IS NOT NULL;  -- Safety check

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            WHEN 'user' THEN
                -- Permanently delete user account and all associated data
                -- Note: Most related data will cascade delete via FK constraints
                DELETE FROM profiles
                WHERE id = v_item.entity_id::UUID
                AND deleted_at IS NOT NULL;  -- Safety check

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            ELSE
                -- Unknown entity type, skip
                v_delete_count := 0;
        END CASE;

        -- Mark as processed
        UPDATE retention_schedule
        SET processed_at = NOW()
        WHERE id = v_item.id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'processed_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION process_retention_schedule IS
    'Processes all pending retention schedules that are ready for deletion. Runs daily via pg_cron. Respects legal holds.';

GRANT EXECUTE ON FUNCTION process_retention_schedule TO authenticated;

-- =====================================================
-- SCHEDULE CLEANUP JOB WITH PG_CRON
-- =====================================================
-- Runs daily at 3 AM UTC
-- Processes all retention schedules that are past their scheduled_for date

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the cleanup job (runs daily at 3 AM UTC)
SELECT cron.schedule(
    'process-retention-schedule',
    '0 3 * * *',  -- Daily at 3 AM UTC
    $$SELECT process_retention_schedule()$$
);

COMMENT ON EXTENSION pg_cron IS
    'pg_cron extension for scheduled jobs. Used for automated retention cleanup and email warnings.';

-- =====================================================
-- MIGRATION COMPLETE - PHASE 4
-- =====================================================
-- Cleanup job configured to run daily at 3 AM UTC
-- Processes all entities past their 90-day retention period
-- Respects legal holds (legal_hold_until)
-- =====================================================
