import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: send-broadcast-email
 * Sends email broadcasts via Resend Broadcasts API or test emails via transactional API.
 * Admin-only feature.
 *
 * Modes:
 * - broadcast: Sends to entire Resend segment via Broadcasts API
 * - test: Sends same template to admin's email (or specified test_emails) via transactional API
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_SEGMENT_ID = Deno.env.get('RESEND_SEGMENT_ID');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';

/** Strips HTML tags and decodes common entities to produce a plain-text fallback */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Escapes HTML special characters to prevent XSS injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BroadcastPayload {
  subject: string;
  body: string;
  mode: 'broadcast' | 'test';
  test_emails?: string[];
}

/**
 * Build the branded email HTML template.
 * Same design as send-corporate-email: orange gradient header, CambioCromos branding.
 * For broadcasts, uses Resend personalization variables.
 * For tests, uses the admin's nickname directly.
 */
function buildBroadcastHtml(subject: string, body: string, mode: 'broadcast' | 'test', adminNickname?: string): string {
  // Greeting: use Resend personalization for broadcasts, admin name for tests
  const greeting = mode === 'broadcast'
    ? 'Hola {{{contact.first_name|there}}} 👋'
    : `Hola ${escapeHtml(adminNickname || 'there')} 👋`;

  // Unsubscribe: real Resend variable for broadcasts, placeholder for tests
  const unsubscribeHtml = mode === 'broadcast'
    ? '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #9ca3af; text-decoration: underline;">Cancelar suscripción</a>'
    : '<span style="color: #9ca3af; text-decoration: underline; cursor: default;">[Enlace de cancelar suscripción aparecerá aquí]</span>';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FFC000 0%, #FF8C00 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">CambioCromos</h1>
    </div>
    <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #1f2937; font-size: 18px; margin-top: 0;">${greeting}</p>
      <h2 style="color: #1f2937; font-size: 20px;">${escapeHtml(subject)}</h2>
      <p style="color: #4b5563; margin: 16px 0; white-space: pre-wrap;">${escapeHtml(body)}</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin: 0;">Este es un mensaje del equipo de CambioCromos</p>
      <p style="margin: 8px 0 0 0;">${unsubscribeHtml}</p>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.error('[send-broadcast-email] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, nickname')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: BroadcastPayload = await req.json();
    const { subject, body, mode, test_emails } = payload;

    if (!subject?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Subject and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mode || !['broadcast', 'test'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Mode must be "broadcast" or "test"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-broadcast-email] Mode: ${mode}, Subject: ${subject}`);

    // ─── TEST MODE ─────────────────────────────────────────────
    if (mode === 'test') {
      const recipients = test_emails?.length ? test_emails : [user.email!];
      const htmlContent = buildBroadcastHtml(subject.trim(), body.trim(), 'test', adminProfile.nickname);

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const email of recipients) {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: email.trim(),
              subject: `[TEST] ${subject.trim()}`,
              html: htmlContent,
              text: stripHtml(htmlContent),
              reply_to: 'info@cambiocromos.com',
            }),
          });

          if (response.ok) {
            results.push({ email: email.trim(), success: true });
            console.log(`[send-broadcast-email] Test sent to: ${email}`);
          } else {
            const err = await response.json();
            results.push({ email: email.trim(), success: false, error: err.message || 'Unknown error' });
            console.error(`[send-broadcast-email] Test failed for ${email}:`, err);
          }
        } catch (err) {
          results.push({ email: email.trim(), success: false, error: err.message });
        }

        // Small delay between test sends
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'test', results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── BROADCAST MODE ────────────────────────────────────────
    if (!RESEND_SEGMENT_ID) {
      return new Response(
        JSON.stringify({ error: 'RESEND_SEGMENT_ID not configured. Create a segment in Resend Dashboard first.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = buildBroadcastHtml(subject.trim(), body.trim(), 'broadcast');

    // Create and send broadcast via Resend Broadcasts API
    const broadcastResponse = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        segmentId: RESEND_SEGMENT_ID,
        from: FROM_EMAIL,
        subject: subject.trim(),
        html: htmlContent,
        text: stripHtml(htmlContent),
        replyTo: 'info@cambiocromos.com',
        name: `Broadcast: ${subject.trim().substring(0, 50)}`,
        send: true,
      }),
    });

    const broadcastResult = await broadcastResponse.json();

    if (!broadcastResponse.ok) {
      console.error('[send-broadcast-email] Broadcast failed:', broadcastResult);

      // Log failure
      await supabase.from('broadcast_log').insert({
        resend_broadcast_id: 'failed',
        subject: subject.trim(),
        body: body.trim(),
        sent_by: user.id,
        status: 'failed',
        error_details: JSON.stringify(broadcastResult),
      });

      return new Response(
        JSON.stringify({ error: 'Failed to send broadcast', details: broadcastResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-broadcast-email] Broadcast sent:', broadcastResult);

    // Log success
    await supabase.from('broadcast_log').insert({
      resend_broadcast_id: broadcastResult.id || 'unknown',
      subject: subject.trim(),
      body: body.trim(),
      sent_by: user.id,
      status: 'sent',
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'broadcast',
        broadcast_id: broadcastResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-broadcast-email] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
