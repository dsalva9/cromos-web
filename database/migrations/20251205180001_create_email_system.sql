-- =====================================================
-- PHASE 5: EMAIL SYSTEM WITH PLACEHOLDERS
-- =====================================================
-- Email notification system for retention warnings
-- Uses placeholder sender until email service configured
-- =====================================================

-- =====================================================
-- FUNCTION: schedule_email
-- =====================================================
-- Queues an email to be sent
-- Already referenced by admin_suspend_account, now formally created
CREATE OR REPLACE FUNCTION schedule_email(
    p_recipient_email TEXT,
    p_template_name TEXT,
    p_template_data JSONB,
    p_send_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_id BIGINT;
BEGIN
    INSERT INTO pending_emails (
        recipient_email,
        template_name,
        template_data,
        scheduled_for,
        created_at
    ) VALUES (
        p_recipient_email,
        p_template_name,
        p_template_data,
        p_send_at,
        NOW()
    )
    RETURNING id INTO v_email_id;

    RETURN v_email_id;
END;
$$;

COMMENT ON FUNCTION schedule_email IS
    'Queues an email to be sent. Emails are processed by external email service (Resend/SendGrid/etc).';

GRANT EXECUTE ON FUNCTION schedule_email TO authenticated;

-- =====================================================
-- FUNCTION: send_deletion_warnings
-- =====================================================
-- Sends email warnings for USER-INITIATED account deletions ONLY
-- Does NOT send warnings for admin-suspended accounts
-- Runs daily via pg_cron to check for 7/3/1 day warnings
CREATE OR REPLACE FUNCTION send_deletion_warnings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_count_7day INTEGER := 0;
    v_count_3day INTEGER := 0;
    v_count_1day INTEGER := 0;
    v_user RECORD;
BEGIN
    -- =====================================================
    -- 7-DAY WARNINGS (user-initiated deletions only)
    -- =====================================================
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
        AND rs.scheduled_for::DATE = (CURRENT_DATE + INTERVAL '7 days')::DATE
        AND (rs.legal_hold_until IS NULL OR rs.legal_hold_until < NOW())
        AND rs.reason = 'user_requested'  -- ONLY user-initiated deletions get warnings
        AND NOT EXISTS (
            -- Don't send duplicate warnings
            SELECT 1 FROM pending_emails
            WHERE template_name = 'deletion_warning_7_days'
            AND template_data->>'user_id' = p.id::TEXT
        )
    LOOP
        PERFORM schedule_email(
            v_user.email,
            'deletion_warning_7_days',
            jsonb_build_object(
                'user_id', v_user.id,
                'nickname', v_user.nickname,
                'deletion_date', v_user.scheduled_for,
                'days_remaining', 7,
                'recovery_url', 'https://cambiocromo.com/recover-account'  -- TODO: Add token
            ),
            NOW()
        );
        v_count_7day := v_count_7day + 1;
    END LOOP;

    -- =====================================================
    -- 3-DAY WARNINGS (user-initiated deletions only)
    -- =====================================================
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
        AND rs.scheduled_for::DATE = (CURRENT_DATE + INTERVAL '3 days')::DATE
        AND (rs.legal_hold_until IS NULL OR rs.legal_hold_until < NOW())
        AND rs.reason = 'user_requested'
        AND NOT EXISTS (
            SELECT 1 FROM pending_emails
            WHERE template_name = 'deletion_warning_3_days'
            AND template_data->>'user_id' = p.id::TEXT
        )
    LOOP
        PERFORM schedule_email(
            v_user.email,
            'deletion_warning_3_days',
            jsonb_build_object(
                'user_id', v_user.id,
                'nickname', v_user.nickname,
                'deletion_date', v_user.scheduled_for,
                'days_remaining', 3,
                'recovery_url', 'https://cambiocromo.com/recover-account'
            ),
            NOW()
        );
        v_count_3day := v_count_3day + 1;
    END LOOP;

    -- =====================================================
    -- 1-DAY FINAL WARNINGS (user-initiated deletions only)
    -- =====================================================
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
        AND rs.scheduled_for::DATE = (CURRENT_DATE + INTERVAL '1 day')::DATE
        AND (rs.legal_hold_until IS NULL OR rs.legal_hold_until < NOW())
        AND rs.reason = 'user_requested'
        AND NOT EXISTS (
            SELECT 1 FROM pending_emails
            WHERE template_name = 'deletion_warning_1_day'
            AND template_data->>'user_id' = p.id::TEXT
        )
    LOOP
        PERFORM schedule_email(
            v_user.email,
            'deletion_warning_1_day',
            jsonb_build_object(
                'user_id', v_user.id,
                'nickname', v_user.nickname,
                'deletion_date', v_user.scheduled_for,
                'days_remaining', 1,
                'recovery_url', 'https://cambiocromo.com/recover-account'
            ),
            NOW()
        );
        v_count_1day := v_count_1day + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'warnings_7day', v_count_7day,
        'warnings_3day', v_count_3day,
        'warnings_1day', v_count_1day,
        'total_warnings', v_count_7day + v_count_3day + v_count_1day,
        'sent_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION send_deletion_warnings IS
    'Sends 7/3/1 day deletion warnings for USER-INITIATED account deletions only. Admin-suspended accounts do NOT receive warnings. Runs daily via pg_cron.';

GRANT EXECUTE ON FUNCTION send_deletion_warnings TO authenticated;

-- =====================================================
-- SCHEDULE EMAIL WARNING JOB WITH PG_CRON
-- =====================================================
-- Runs daily at noon UTC to send deletion warnings

SELECT cron.schedule(
    'send-deletion-warnings',
    '0 12 * * *',  -- Daily at noon UTC
    $$SELECT send_deletion_warnings()$$
);

-- =====================================================
-- MIGRATION COMPLETE - PHASE 5
-- =====================================================
-- Email system configured with placeholders
-- Deletion warnings scheduled for daily sending
-- Email queue ready for external service integration
--
-- NEXT STEPS (when email service is ready):
-- 1. Configure Resend/SendGrid/AWS SES credentials
-- 2. Create Edge Function to process pending_emails queue
-- 3. Create HTML email templates
-- =====================================================
