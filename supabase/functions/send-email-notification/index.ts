import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: send-email-notification
 * Sends email notifications via Resend
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';

interface NotificationPayload {
  user_id: string;
  notification_kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Escapes HTML special characters to prevent XSS injection.
 * Applied to all user-controlled values before embedding in the email template.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates that a URL uses the https:// protocol.
 * Blocks javascript:, data:, and other dangerous protocol injections.
 */
function isSafeUrl(url: string): boolean {
  return url.startsWith('https://');
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

Deno.serve(async (req) => {
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

    console.log('[send-email-notification] Processing:', {
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

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error('[send-email-notification] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
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
      console.error('[send-email-notification] Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user settings', details: settingsError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!settings || settings.length === 0) {
      console.log('[send-email-notification] User not found:', user_id);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userSettings: UserSettings = settings[0];

    console.log('[send-email-notification] User settings:', {
      user_id: userSettings.user_id,
      has_email: !!userSettings.email,
      preferences: userSettings.preferences,
    });

    // Check if user has an email
    if (!userSettings.email) {
      console.log('[send-email-notification] No email for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'User has no email address' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email notifications are enabled for this specific notification type
    const emailEnabled = userSettings.preferences?.email?.[notification_kind] ?? true;

    if (!emailEnabled) {
      console.log('[send-email-notification] Email disabled for notification type:', {
        user_id,
        notification_kind,
      });
      return new Response(
        JSON.stringify({ message: `Email notifications disabled for ${notification_kind}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FFC000 0%, #FF8C00 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .content {
              background: #ffffff;
              padding: 30px 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .content h2 {
              color: #1f2937;
              font-size: 20px;
              margin-top: 0;
            }
            .content p {
              color: #4b5563;
              margin: 16px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #FFC000;
              color: #000000;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CambioCromos</h1>
          </div>
          <div class="content">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(body)}</p>
            ${data?.action_url && isSafeUrl(String(data.action_url)) ? `<a href="${escapeHtml(String(data.action_url))}" class="button">Ver ahora</a>` : ''}
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de CambioCromos</p>
            <p>Si no deseas recibir estos correos, puedes ajustar tus preferencias en la configuración de la app</p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    console.log('[send-email-notification] Sending to Resend:', {
      to: userSettings.email,
      from: FROM_EMAIL,
      subject: title,
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: userSettings.email,
        subject: title,
        html: htmlContent,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[send-email-notification] Resend error:', resendResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send email notification', details: resendResult }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-email-notification] Success:', resendResult);

    return new Response(
      JSON.stringify({ success: true, result: resendResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-email-notification] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
