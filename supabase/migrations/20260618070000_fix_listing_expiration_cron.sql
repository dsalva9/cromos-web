-- Fix: listing expiration cron job was using current_setting('supabase.service_role_key')
-- which is not available in the pg_cron context. Remove the Authorization header
-- and match the pattern used by other working cron jobs (send-user-summary-email, etc).
-- The edge function now has verify_jwt=false so no auth header is needed.

DO $do$
BEGIN
    -- Remove the broken cron job
    IF EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'process-listing-expiration'
    ) THEN
        PERFORM cron.unschedule('process-listing-expiration');
    END IF;

    -- Re-create with correct config (no Authorization header)
    PERFORM cron.schedule(
        'process-listing-expiration',
        '0 4 * * *',
        $$
        SELECT net.http_post(
            url := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/process-listing-expiration',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := '{}'::jsonb
        );
        $$
    );
END
$do$;
