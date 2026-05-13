-- Update default notification preferences logic
-- This function returns the default JSONB structure for notification preferences
-- based on the priority of each notification type and the channels it supports.

CREATE OR REPLACE FUNCTION "public"."get_default_notification_preferences"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  high_priority_types TEXT[] := ARRAY[
    'listing_reserved',
    'listing_completed',
    'user_rated',
    'system_message',
    'level_up'
  ];
  email_disabled_high_priority TEXT[] := ARRAY[
    'badge_earned'
  ];
  email_only_types TEXT[] := ARRAY[
    'chat_unread'
  ];
  low_priority_types TEXT[] := ARRAY[
    'listing_chat',
    'template_rated'
  ];
  always_enabled_types TEXT[] := ARRAY[
    'admin_action'
  ];
  legacy_disabled_types TEXT[] := ARRAY[
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

  -- Set high-priority types with email disabled (Logro ganado)
  FOREACH notification_type IN ARRAY email_disabled_high_priority
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'true'::jsonb);
    result := jsonb_set(result, ARRAY['email', notification_type], 'false'::jsonb);
  END LOOP;

  -- Set email-only types (Resumen semanal)
  FOREACH notification_type IN ARRAY email_only_types
  LOOP
    result := jsonb_set(result, ARRAY['in_app', notification_type], 'false'::jsonb);
    result := jsonb_set(result, ARRAY['push', notification_type], 'false'::jsonb);
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

-- Update existing users to enable 'chat_unread' email notifications by default
-- if they haven't explicitly opted out or if they are missing the key.
UPDATE profiles
SET notification_preferences = jsonb_set(
  COALESCE(notification_preferences, get_default_notification_preferences()),
  '{email, chat_unread}',
  'true'::jsonb
)
WHERE notification_preferences IS NULL 
   OR NOT (notification_preferences ? 'in_app')
   OR (notification_preferences->'email'->>'chat_unread') IS NULL
   OR (notification_preferences->'email'->>'chat_unread') = 'false';

-- Update 'badge_earned' to be false for email for existing users who haven't set it yet
-- this aligns them with the new default for new users.
UPDATE profiles
SET notification_preferences = jsonb_set(
  notification_preferences,
  '{email, badge_earned}',
  'false'::jsonb
)
WHERE (notification_preferences ? 'in_app')
  AND ((notification_preferences->'email'->>'badge_earned') IS NULL);

-- Update the default value for the column to use the function
ALTER TABLE "public"."profiles" ALTER COLUMN "notification_preferences" SET DEFAULT get_default_notification_preferences();
