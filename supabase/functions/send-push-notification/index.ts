/**
 * Supabase Edge Function: send-push-notification
 * Sends push notifications via OneSignal REST API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
const ONESIGNAL_APP_ID = '3b9eb764-f440-404d-949a-1468356afc18';

interface NotificationPayload {
  user_id: string;
  notification_kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface UserSettings {
  user_id: string;
  email: string | null;
  onesignal_player_id: string | null;
  preferences: {
    push: Record<string, boolean>;
    email: Record<string, boolean>;
    in_app: Record<string, boolean>;
  };
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const payload: NotificationPayload = await req.json();
    const { user_id, notification_kind, title, body, data } = payload;

    console.log('[send-push-notification] Processing:', {
      user_id,
      notification_kind,
      title,
    });

    // Validate required fields
    if (!user_id || !notification_kind || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if OneSignal API key is configured
    if (!ONESIGNAL_REST_API_KEY) {
      console.error('[send-push-notification] OneSignal API key not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's notification settings
    const { data: settings, error: settingsError } = await supabase.rpc(
      'get_user_notification_settings',
      { p_user_id: user_id }
    );

    if (settingsError) {
      console.error('[send-push-notification] Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user settings', details: settingsError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!settings || settings.length === 0) {
      console.log('[send-push-notification] User not found:', user_id);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userSettings: UserSettings = settings[0];

    console.log('[send-push-notification] User settings:', {
      user_id: userSettings.user_id,
      has_player_id: !!userSettings.onesignal_player_id,
      preferences: userSettings.preferences,
    });

    // Check if user has a OneSignal player ID
    if (!userSettings.onesignal_player_id) {
      console.log('[send-push-notification] No player ID for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'User not subscribed to push notifications' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if push notifications are enabled for this specific notification type
    const pushEnabled = userSettings.preferences?.push?.[notification_kind] ?? true;

    if (!pushEnabled) {
      console.log('[send-push-notification] Push disabled for notification type:', {
        user_id,
        notification_kind,
      });
      return new Response(
        JSON.stringify({ message: `Push notifications disabled for ${notification_kind}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification via OneSignal REST API
    console.log('[send-push-notification] Sending to OneSignal:', {
      player_id: userSettings.onesignal_player_id,
      title,
      body,
    });

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [userSettings.onesignal_player_id],
        headings: { en: title },
        contents: { en: body },
        data: {
          notification_kind,
          ...data,
        },
      }),
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('[send-push-notification] OneSignal error:', oneSignalResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: oneSignalResult }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-push-notification] Success:', oneSignalResult);

    return new Response(
      JSON.stringify({ success: true, result: oneSignalResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-push-notification] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
