import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: send-user-summary-email
 * Sends summary emails about new user registrations
 * Can be triggered by pg_cron (daily/weekly) or manually from admin console
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';

// CORS headers for browser requests (manual trigger)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SummaryPayload {
    frequency: 'daily' | 'weekly' | 'manual';
    days_lookback?: number;
}

interface NewUser {
    user_id: string;
    nickname: string;
    email: string;
    created_at: string;
    listings_count: number;
    albums_count: number;
    chat_messages_count: number;
}

interface Recipient {
    id: number;
    email: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight request
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
            console.error('[send-user-summary-email] Resend API key not configured');
            return new Response(
                JSON.stringify({ error: 'Resend not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // For manual triggers, verify admin access
        const authHeader = req.headers.get('Authorization');
        if (authHeader && !authHeader.includes(supabaseServiceKey)) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);

            if (userError || !user) {
                return new Response(
                    JSON.stringify({ error: 'Invalid token' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_admin) {
                return new Response(
                    JSON.stringify({ error: 'Admin access required' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const payload: SummaryPayload = await req.json();
        const { frequency, days_lookback } = payload;

        // Determine lookback days based on frequency
        const days = days_lookback ?? (frequency === 'daily' ? 1 : 7);

        console.log('[send-user-summary-email] Processing:', { frequency, days });

        // Get new users summary
        const { data: newUsers, error: usersError } = await supabase.rpc(
            'admin_get_new_users_summary',
            { p_days: days }
        );

        if (usersError) {
            console.error('[send-user-summary-email] Error fetching users:', usersError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch user summary', details: usersError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get recipients based on frequency
        const recipientFrequency = frequency === 'manual' ? 'weekly' : frequency;
        let recipients: Recipient[] = [];

        if (frequency === 'manual') {
            // For manual, send only to addresses that have opted in (daily or weekly)
            const { data: allRecipients } = await supabase
                .from('email_forwarding_addresses')
                .select('id, email')
                .eq('is_active', true)
                .neq('summary_email_frequency', 'none');
            recipients = allRecipients || [];
        } else {
            const { data: freqRecipients, error: recipientsError } = await supabase.rpc(
                'admin_get_summary_recipients',
                { p_frequency: frequency }
            );

            if (recipientsError) {
                console.error('[send-user-summary-email] Error fetching recipients:', recipientsError);
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch recipients', details: recipientsError }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            recipients = freqRecipients || [];
        }

        if (recipients.length === 0) {
            console.log('[send-user-summary-email] No recipients configured for frequency:', frequency);
            return new Response(
                JSON.stringify({ success: true, message: 'No recipients configured', sent_count: 0 }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Build email content
        const periodLabel = days === 1 ? 'las últimas 24 horas' : `los últimos ${days} días`;
        const usersList = newUsers as NewUser[];

        let usersHtml: string;
        if (usersList.length === 0) {
            usersHtml = `
        <p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">
          No se han registrado nuevos usuarios en ${periodLabel}.
        </p>
      `;
        } else {
            usersHtml = `
        <p style="color: #4b5563; margin-bottom: 16px;">
          Se han registrado <strong>${usersList.length}</strong> nuevos usuarios en ${periodLabel}:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Nickname</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Email</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Anuncios</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Álbumes</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Mensajes</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Registro</th>
            </tr>
          </thead>
          <tbody>
            ${usersList.map((user, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${user.nickname}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${user.email}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${user.listings_count}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${user.albums_count}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${user.chat_messages_count}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${new Date(user.created_at).toLocaleDateString('es-ES')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
        }

        const frequencyLabel = frequency === 'daily' ? 'Diario' : frequency === 'weekly' ? 'Semanal' : 'Manual';
        const subject = `[CambioCromos] Resumen de nuevos usuarios - ${frequencyLabel}`;

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FFC000 0%, #FF8C00 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">CambioCromos</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Resumen de Nuevos Usuarios</p>
          </div>
          <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; margin-bottom: 20px;">
              📊 Resumen de ${periodLabel}
            </h2>
            ${usersHtml}
          </div>
          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">Este es un email automático del sistema de CambioCromos</p>
            <p style="margin: 8px 0 0 0;">Puedes gestionar tus preferencias de resumen en el panel de administración</p>
          </div>
        </body>
      </html>
    `;

        // Send to all recipients with rate limiting
        let sentCount = 0;
        const errors: { email: string; error: string }[] = [];

        for (const recipient of recipients) {
            try {
                const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: recipient.email,
                        subject: subject,
                        html: htmlContent,
                    }),
                });

                if (resendResponse.ok) {
                    sentCount++;
                    console.log('[send-user-summary-email] Sent to:', recipient.email);
                } else {
                    const error = await resendResponse.json();
                    errors.push({ email: recipient.email, error: JSON.stringify(error) });
                    console.error('[send-user-summary-email] Failed to send to:', recipient.email, error);
                }

                // Rate limiting: 600ms delay between sends
                if (recipients.indexOf(recipient) < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            } catch (err) {
                errors.push({ email: recipient.email, error: err.message });
                console.error('[send-user-summary-email] Error sending to:', recipient.email, err);
            }
        }

        console.log('[send-user-summary-email] Complete:', { sentCount, errorCount: errors.length });

        return new Response(
            JSON.stringify({
                success: true,
                sent_count: sentCount,
                new_users_count: usersList.length,
                errors: errors.length > 0 ? errors : undefined
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[send-user-summary-email] Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
