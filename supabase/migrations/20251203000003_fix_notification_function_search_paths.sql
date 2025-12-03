-- Fix search_path for notification-related functions
-- These functions handle notification creation and delivery

-- Fix should_send_notification
CREATE OR REPLACE FUNCTION public.should_send_notification(
  p_user_id uuid,
  p_channel text,
  p_kind text
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_preferences jsonb;
  v_enabled boolean;
BEGIN
  -- Get user's notification preferences
  SELECT notification_preferences INTO v_preferences
  FROM profiles
  WHERE id = p_user_id;

  -- If no preferences set, use defaults
  IF v_preferences IS NULL THEN
    RETURN true;
  END IF;

  -- Check if channel and kind are enabled
  v_enabled := (v_preferences->p_channel->>p_kind)::boolean;

  RETURN COALESCE(v_enabled, true);
END;
$$;

-- Fix send_push_notification_trigger
CREATE OR REPLACE FUNCTION public.send_push_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_player_id text;
  v_should_send boolean;
BEGIN
  -- Check if user has push notifications enabled for this notification type
  SELECT should_send_notification(NEW.user_id, 'push', NEW.kind)
  INTO v_should_send;

  IF NOT v_should_send THEN
    RETURN NEW;
  END IF;

  -- Get OneSignal player ID
  SELECT onesignal_player_id INTO v_player_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- If user has registered for push notifications, send via edge function
  IF v_player_id IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := current_setting('app.settings.edge_function_url') || '/send-push-notification',
      body := jsonb_build_object(
        'player_id', v_player_id,
        'notification_id', NEW.id,
        'kind', NEW.kind,
        'payload', NEW.payload
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix get_notifications
CREATE OR REPLACE FUNCTION public.get_notifications()
RETURNS TABLE (
  id bigint,
  user_id uuid,
  kind text,
  trade_id bigint,
  listing_id bigint,
  template_id bigint,
  rating_id bigint,
  actor_id uuid,
  created_at timestamptz,
  read_at timestamptz,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.kind,
    n.trade_id,
    n.listing_id,
    n.template_id,
    n.rating_id,
    n.actor_id,
    n.created_at,
    n.read_at,
    n.payload
  FROM notifications n
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC;
END;
$$;

-- Fix mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id bigint)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
  AND user_id = auth.uid()
  AND read_at IS NULL;
END;
$$;

-- Fix mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
  AND read_at IS NULL;
END;
$$;

-- Fix get_notification_count
CREATE OR REPLACE FUNCTION public.get_notification_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = auth.uid()
    AND read_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.should_send_notification IS 'Checks if notification should be sent based on user preferences. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.send_push_notification_trigger IS 'Trigger to send push notifications via OneSignal. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.get_notifications IS 'Returns all notifications for current user. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marks a notification as read. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marks all notifications as read for current user. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.get_notification_count IS 'Returns count of unread notifications for current user. SECURITY DEFINER with search_path set.';
