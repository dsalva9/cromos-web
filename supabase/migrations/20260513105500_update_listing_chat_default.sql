-- Update get_default_notification_preferences to make listing_chat high priority
-- This changes the default so new users get email and push notifications for chat messages by default.

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
    'level_up',
    'listing_chat'
  ];
  email_disabled_high_priority TEXT[] := ARRAY[
    'badge_earned'
  ];
  email_only_types TEXT[] := ARRAY[
    'chat_unread'
  ];
  low_priority_types TEXT[] := ARRAY[
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
