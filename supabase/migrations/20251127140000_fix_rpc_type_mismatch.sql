-- Fix RPC function type mismatch
-- The auth.users.email column is varchar(255) but we declared it as TEXT
-- This migration adds explicit casting to fix the type mismatch

DROP FUNCTION IF EXISTS get_user_notification_settings(UUID);

CREATE OR REPLACE FUNCTION get_user_notification_settings(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    onesignal_player_id TEXT,
    push_enabled BOOLEAN,
    email_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        au.email::TEXT,  -- Explicit cast to TEXT
        p.onesignal_player_id,
        COALESCE((p.notification_preferences->>'push_enabled')::boolean, true) AS push_enabled,
        COALESCE((p.notification_preferences->>'email_enabled')::boolean, true) AS email_enabled
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION get_user_notification_settings(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_notification_settings(UUID) TO service_role;

COMMENT ON FUNCTION get_user_notification_settings(UUID) IS 
    'Returns user notification settings for Edge Functions. Service role only. Fixed type mismatch for email column.';
