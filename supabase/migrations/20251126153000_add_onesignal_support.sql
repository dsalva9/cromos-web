-- =====================================================
-- OneSignal Integration: Player ID & Notification Preferences
-- =====================================================
-- Purpose: Add support for OneSignal push and email notifications
-- Date: 2025-11-26
-- =====================================================

-- =============================================
-- PART 1: SCHEMA ALTERATIONS
-- =============================================

-- Add OneSignal player ID column to profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'onesignal_player_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onesignal_player_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id 
            ON profiles(onesignal_player_id) 
            WHERE onesignal_player_id IS NOT NULL;
    END IF;
END $$;

-- Add notification preferences column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
            "push_enabled": true,
            "email_enabled": true
        }'::jsonb;
    END IF;
END $$;

-- Add column comments
COMMENT ON COLUMN profiles.onesignal_player_id IS 'OneSignal player/subscription ID for push notifications';
COMMENT ON COLUMN profiles.notification_preferences IS 'User preferences for notification channels (push, email). In-app is always enabled.';

-- =============================================
-- PART 2: RPC FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- RPC: update_onesignal_player_id
-- -----------------------------------------------
-- Updates the OneSignal player ID for the current user

DROP FUNCTION IF EXISTS update_onesignal_player_id(TEXT);

CREATE OR REPLACE FUNCTION update_onesignal_player_id(p_player_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    UPDATE profiles
    SET onesignal_player_id = p_player_id,
        updated_at = NOW()
    WHERE id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for current user';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_onesignal_player_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_onesignal_player_id(TEXT) TO authenticated;

COMMENT ON FUNCTION update_onesignal_player_id(TEXT) IS 
    'Updates the OneSignal player ID for the authenticated user. Called when user subscribes to push notifications.';

-- -----------------------------------------------
-- RPC: get_notification_preferences
-- -----------------------------------------------
-- Returns notification preferences for the current user

DROP FUNCTION IF EXISTS get_notification_preferences();

CREATE OR REPLACE FUNCTION get_notification_preferences()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_preferences JSONB;
BEGIN
    SELECT notification_preferences INTO v_preferences
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for current user';
    END IF;
    
    -- Return preferences with defaults if null
    RETURN COALESCE(v_preferences, '{"push_enabled": true, "email_enabled": true}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION get_notification_preferences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_notification_preferences() TO authenticated;

COMMENT ON FUNCTION get_notification_preferences() IS 
    'Returns notification preferences for the authenticated user.';

-- -----------------------------------------------
-- RPC: update_notification_preferences
-- -----------------------------------------------
-- Updates notification preferences for the current user

DROP FUNCTION IF EXISTS update_notification_preferences(JSONB);

CREATE OR REPLACE FUNCTION update_notification_preferences(p_preferences JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    -- Validate preferences structure
    IF NOT (p_preferences ? 'push_enabled' AND p_preferences ? 'email_enabled') THEN
        RAISE EXCEPTION 'Invalid preferences format. Must include push_enabled and email_enabled.';
    END IF;
    
    -- Validate boolean values
    IF NOT (
        jsonb_typeof(p_preferences->'push_enabled') = 'boolean' AND
        jsonb_typeof(p_preferences->'email_enabled') = 'boolean'
    ) THEN
        RAISE EXCEPTION 'Preference values must be boolean.';
    END IF;
    
    UPDATE profiles
    SET notification_preferences = p_preferences,
        updated_at = NOW()
    WHERE id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for current user';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_notification_preferences(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_notification_preferences(JSONB) TO authenticated;

COMMENT ON FUNCTION update_notification_preferences(JSONB) IS 
    'Updates notification preferences for the authenticated user. Expects {push_enabled: boolean, email_enabled: boolean}.';

-- =============================================
-- PART 3: HELPER FUNCTION FOR EDGE FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- RPC: get_user_notification_settings
-- -----------------------------------------------
-- Returns user's OneSignal player ID and preferences
-- Used by Edge Functions to determine if/how to send notifications

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
        au.email,
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
    'Returns user notification settings for Edge Functions. Service role only.';

-- =============================================
-- PART 4: BACKFILL EXISTING USERS
-- =============================================

-- Set default preferences for existing users who don't have them
UPDATE profiles
SET notification_preferences = '{
    "push_enabled": true,
    "email_enabled": true
}'::jsonb
WHERE notification_preferences IS NULL;

-- =============================================
-- PART 5: VERIFICATION
-- =============================================

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'onesignal_player_id'
    ) THEN
        RAISE EXCEPTION 'Migration failed: onesignal_player_id column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
    ) THEN
        RAISE EXCEPTION 'Migration failed: notification_preferences column not created';
    END IF;
    
    RAISE NOTICE 'OneSignal support migration completed successfully';
END $$;
