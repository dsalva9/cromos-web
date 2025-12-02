-- =====================================================
-- Migration: Granular Notification Preferences
-- Date: 2025-12-02
-- Description: Transform notification preferences from channel-only toggles
--              to per-notification-type preferences across all channels
-- =====================================================

-- =====================================================
-- PART 1: Helper Functions
-- =====================================================

-- Function to get default preferences for a notification kind
-- High-priority notifications enabled by default, low-priority disabled for push/email
CREATE OR REPLACE FUNCTION get_default_notification_preferences()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  high_priority_types TEXT[] := ARRAY[
    'listing_reserved',
    'listing_completed',
    'user_rated',
    'badge_earned',
    'system_message',
    'level_up'
  ];
  low_priority_types TEXT[] := ARRAY[
    'listing_chat',
    'template_rated'
  ];
  always_enabled_types TEXT[] := ARRAY[
    'admin_action'
  ];
  legacy_disabled_types TEXT[] := ARRAY[
    'chat_unread',
    'proposal_accepted',
    'proposal_rejected',
    'finalization_requested'
  ];
  result jsonb := '{"in_app": {}, "push": {}, "email": {}}'::jsonb;
  notification_type TEXT;
BEGIN
  -- Set high-priority types to true for all channels
  FOREACH notification_type IN ARRAY high_priority_types
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['email', notification_type], 'true'::jsonb);
  END LOOP;

  -- Set low-priority types: enabled for in_app, disabled for push/email
  FOREACH notification_type IN ARRAY low_priority_types
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'false'::jsonb);
    result := jsonb_set(result, ARRAY['email', notification_type], 'false'::jsonb);
  END LOOP;

  -- Set always-enabled types (admin_action): enabled on all channels, not configurable
  FOREACH notification_type IN ARRAY always_enabled_types
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['email', notification_type], 'true'::jsonb);
  END LOOP;

  -- Set legacy types (trade notifications): disabled on all channels
  FOREACH notification_type IN ARRAY legacy_disabled_types
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'false'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'false'::jsonb);
    result := jsonb_set(result, ARRAY['email', notification_type], 'false'::jsonb);
  END LOOP;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_default_notification_preferences() IS
  'Returns default granular notification preferences with smart defaults based on notification priority';

-- =====================================================
-- PART 2: Migrate Existing Users
-- =====================================================

-- Migrate existing users from old structure to new granular structure
DO $$
DECLARE
  user_record RECORD;
  old_prefs jsonb;
  new_prefs jsonb;
  push_enabled boolean;
  email_enabled boolean;
  notification_type TEXT;
  all_types TEXT[] := ARRAY[
    'listing_chat',
    'listing_reserved',
    'listing_completed',
    'template_rated',
    'user_rated',
    'badge_earned',
    'chat_unread',
    'proposal_accepted',
    'proposal_rejected',
    'finalization_requested',
    'admin_action',
    'system_message',
    'level_up'
  ];
BEGIN
  -- Process each user
  FOR user_record IN
    SELECT id, notification_preferences
    FROM profiles
    WHERE notification_preferences IS NOT NULL
  LOOP
    old_prefs := user_record.notification_preferences;

    -- Check if already migrated (has 'in_app' key)
    IF old_prefs ? 'in_app' THEN
      CONTINUE; -- Already migrated, skip
    END IF;

    -- Extract old boolean values (default to true if not present)
    push_enabled := COALESCE((old_prefs->>'push_enabled')::boolean, true);
    email_enabled := COALESCE((old_prefs->>'email_enabled')::boolean, true);

    -- Start with default preferences
    new_prefs := get_default_notification_preferences();

    -- Override based on old global toggles
    -- If user had push disabled, disable all push notifications
    IF NOT push_enabled THEN
      FOREACH notification_type IN ARRAY all_types
      LOOP
        new_prefs := jsonb_set(new_prefs, ARRAY['push', notification_type], 'false'::jsonb);
      END LOOP;
    END IF;

    -- If user had email disabled, disable all email notifications
    IF NOT email_enabled THEN
      FOREACH notification_type IN ARRAY all_types
      LOOP
        new_prefs := jsonb_set(new_prefs, ARRAY['email', notification_type], 'false'::jsonb);
      END LOOP;
    END IF;

    -- Update user's preferences
    UPDATE profiles
    SET notification_preferences = new_prefs
    WHERE id = user_record.id;

  END LOOP;

  RAISE NOTICE 'Migration complete: Updated % users', (SELECT COUNT(*) FROM profiles WHERE notification_preferences IS NOT NULL);
END $$;

-- =====================================================
-- PART 3: Update RPC Functions
-- =====================================================

-- Drop old functions
DROP FUNCTION IF EXISTS get_notification_preferences();
DROP FUNCTION IF EXISTS update_notification_preferences(jsonb);
DROP FUNCTION IF EXISTS get_user_notification_settings(uuid);

-- Get notification preferences for current user
CREATE OR REPLACE FUNCTION get_notification_preferences()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_prefs jsonb;
BEGIN
  -- Get user preferences
  SELECT notification_preferences INTO user_prefs
  FROM profiles
  WHERE id = auth.uid();

  -- If null or old format, return defaults
  IF user_prefs IS NULL OR NOT (user_prefs ? 'in_app') THEN
    RETURN get_default_notification_preferences();
  END IF;

  RETURN user_prefs;
END;
$$;

COMMENT ON FUNCTION get_notification_preferences() IS
  'Returns granular notification preferences for the authenticated user';

-- Update notification preferences for current user
CREATE OR REPLACE FUNCTION update_notification_preferences(p_preferences jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel TEXT;
  channels TEXT[] := ARRAY['in_app', 'push', 'email'];
  notification_types TEXT[] := ARRAY[
    'listing_chat',
    'listing_reserved',
    'listing_completed',
    'template_rated',
    'user_rated',
    'badge_earned',
    'chat_unread',
    'proposal_accepted',
    'proposal_rejected',
    'finalization_requested',
    'admin_action',
    'system_message',
    'level_up'
  ];
  notification_type TEXT;
BEGIN
  -- Validate structure: must have all three channels
  FOREACH channel IN ARRAY channels
  LOOP
    IF NOT (p_preferences ? channel) THEN
      RAISE EXCEPTION 'Invalid preferences: missing channel %', channel;
    END IF;

    -- Validate each channel has all notification types as booleans
    FOREACH notification_type IN ARRAY notification_types
    LOOP
      IF NOT (p_preferences->channel ? notification_type) THEN
        RAISE EXCEPTION 'Invalid preferences: missing notification type % in channel %', notification_type, channel;
      END IF;

      IF jsonb_typeof(p_preferences->channel->notification_type) != 'boolean' THEN
        RAISE EXCEPTION 'Invalid preferences: % in channel % must be boolean', notification_type, channel;
      END IF;
    END LOOP;
  END LOOP;

  -- Update user preferences
  UPDATE profiles
  SET notification_preferences = p_preferences
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION update_notification_preferences(jsonb) IS
  'Updates granular notification preferences for the authenticated user with validation';

-- Get user notification settings (for Edge Functions and triggers)
CREATE OR REPLACE FUNCTION get_user_notification_settings(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  onesignal_player_id text,
  preferences jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(au.email, ''::text) as email,
    p.onesignal_player_id,
    COALESCE(p.notification_preferences, get_default_notification_preferences()) as preferences
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE p.id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_notification_settings(uuid) IS
  'Returns user notification settings including email, OneSignal ID, and preferences. Used by Edge Functions.';

-- Check if a specific notification should be sent to a user
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id uuid,
  p_channel text,
  p_kind text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_prefs jsonb;
  is_enabled boolean;
BEGIN
  -- Validate channel
  IF p_channel NOT IN ('in_app', 'push', 'email') THEN
    RAISE EXCEPTION 'Invalid channel: %. Must be in_app, push, or email', p_channel;
  END IF;

  -- Get user preferences
  SELECT notification_preferences INTO user_prefs
  FROM profiles
  WHERE id = p_user_id;

  -- If no preferences, use defaults
  IF user_prefs IS NULL OR NOT (user_prefs ? 'in_app') THEN
    user_prefs := get_default_notification_preferences();
  END IF;

  -- Check if this notification type is enabled for this channel
  is_enabled := COALESCE((user_prefs->p_channel->>p_kind)::boolean, true);

  RETURN is_enabled;
END;
$$;

COMMENT ON FUNCTION should_send_notification(uuid, text, text) IS
  'Checks if a notification of a specific kind should be sent to a user on a specific channel';

-- =====================================================
-- PART 4: Update Column Comment
-- =====================================================

COMMENT ON COLUMN profiles.notification_preferences IS
  'Granular notification preferences per channel and notification type. Structure: {"in_app": {"kind": bool, ...}, "push": {...}, "email": {...}}';

-- =====================================================
-- PART 5: Create Index for Performance
-- =====================================================

-- GIN index for efficient JSONB queries on notification preferences
CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences
ON profiles USING GIN (notification_preferences);

COMMENT ON INDEX idx_profiles_notification_preferences IS
  'GIN index for efficient querying of notification preferences JSONB data';

-- =====================================================
-- PART 6: Grant Permissions
-- =====================================================

-- Grant execute permissions on new functions to authenticated users
GRANT EXECUTE ON FUNCTION get_default_notification_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(uuid, text, text) TO authenticated;

-- Service role only for settings getter
GRANT EXECUTE ON FUNCTION get_user_notification_settings(uuid) TO service_role;

-- =====================================================
-- End of Migration
-- =====================================================
