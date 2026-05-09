import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: send-user-summary-email
 * Sends admin summary emails covering:
 *   - New user registrations
 *   - New reports (pending moderation)
 *   - Messaging activity stats
 *
 * Can be triggered by pg_cron (daily/weekly) or manually from admin console.
 *
 * Authentication:
 * - Cron triggers: No Authorization header needed (verify_jwt is disabled,
 *   and cron calls come from the Supabase internal network via pg_net).
 *   When no auth header is present, the function processes the request directly.
 * - Manual triggers from admin console: Uses Authorization header with admin
 *   user JWT. The function verifies the JWT and checks is_admin on profiles.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
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

/** Escapes HTML special characters */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    country_code: string;
}

interface ReportSummary {
    report_id: number;
    target_type: string;
    reason: string;
    description: string | null;
    reporter_nickname: string;
    target_label: string;
    status: string;
    created_at: string;
}

interface MessagingActivity {
    total_messages: number;
    unique_senders: number;
    unique_receivers: number;
    unique_conversations: number;
    messages_per_day: number;
    busiest_hour: number | null;
    top_senders: { nickname: string; message_count: number }[];
}

interface Recipient {
    id: number;
    email: string;
}

interface MessagingByCountry {
    country_code: string;
    total_messages: number;
    unique_senders: number;
    unique_conversations: number;
}

interface ListingsByCountry {
    country_code: string;
    total_listings: number;
    users: { nickname: string; listings_count: number; title: string; listing_type: string; collection_name: string }[];
}

// Country reference data (mirrors src/constants/countries.ts)
const SUPPORTED_COUNTRIES = [
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
];

function getCountryInfo(code: string) {
    return SUPPORTED_COUNTRIES.find(c => c.code === code) || { code, name: code, flag: '🌍' };
}

/** Map report reason to a human-readable Spanish label */
function getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
        spam: 'Spam',
        inappropriate_content: 'Contenido inapropiado',
        harassment: 'Acoso',
        copyright_violation: 'Violación de copyright',
        misleading_information: 'Info engañosa',
        fake_listing: 'Anuncio falso',
        offensive_language: 'Lenguaje ofensivo',
        other: 'Otro',
    };
    return labels[reason] || reason;
}

/** Map target type to Spanish */
function getTargetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        listing: 'Anuncio',
        template: 'Colección',
        user: 'Usuario',
        rating: 'Valoración',
    };
    return labels[type] || type;
}

/** Map report status to a styled indicator */
function getStatusIndicator(status: string): string {
    if (status === 'pending') return '🔴 Pendiente';
    if (status === 'reviewing') return '🟡 Revisando';
    if (status === 'resolved') return '✅ Resuelto';
    if (status === 'dismissed') return '⚪ Descartado';
    return status;
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

        // Authentication:
        // - No Authorization header = internal cron call (verify_jwt is disabled,
        //   only pg_net from Supabase's internal network can reach this)
        // - With Authorization header = manual admin trigger, verify JWT + is_admin
        const authHeader = req.headers.get('Authorization');

        if (authHeader) {
            // Check if it's the service role key (still support this path)
            if (!authHeader.includes(supabaseServiceKey)) {
                // Not service role, verify as admin user
                const token = authHeader.replace('Bearer ', '');
                const { data: { user }, error: userError } = await supabase.auth.getUser(token);

                if (userError || !user) {
                    console.error('[send-user-summary-email] Auth failed:', userError?.message);
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
            console.log('[send-user-summary-email] Auth: manual/service-role trigger');
        } else {
            console.log('[send-user-summary-email] Auth: cron trigger (no auth header)');
        }

        const payload: SummaryPayload = await req.json();
        const { frequency, days_lookback } = payload;

        // Determine lookback days based on frequency
        const days = days_lookback ?? (frequency === 'daily' ? 1 : 7);

        console.log('[send-user-summary-email] Processing:', { frequency, days });

        // ─── Fetch all data in parallel ───
        const [usersResult, reportsResult, messagingResult, messagingByCountryResult, listingsByCountryResult] = await Promise.all([
            supabase.rpc('admin_get_new_users_summary', { p_days: days }),
            supabase.rpc('admin_get_pending_reports_summary', { p_days: days }),
            supabase.rpc('admin_get_messaging_activity_summary', { p_days: days }),
            supabase.rpc('admin_get_messaging_activity_by_country', { p_days: days }),
            supabase.rpc('admin_get_new_listings_by_country', { p_days: days }),
        ]);

        if (usersResult.error) {
            console.error('[send-user-summary-email] Error fetching users:', usersResult.error);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch user summary', details: usersResult.error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (reportsResult.error) {
            console.error('[send-user-summary-email] Error fetching reports:', reportsResult.error);
            // Non-fatal: continue without reports section
        }

        if (messagingResult.error) {
            console.error('[send-user-summary-email] Error fetching messaging:', messagingResult.error);
            // Non-fatal: continue without messaging section
        }

        if (messagingByCountryResult.error) {
            console.error('[send-user-summary-email] Error fetching messaging by country:', messagingByCountryResult.error);
            // Non-fatal: continue without country breakdown
        }

        if (listingsByCountryResult.error) {
            console.error('[send-user-summary-email] Error fetching listings by country:', listingsByCountryResult.error);
            // Non-fatal: continue without listings section
        }

        // Get recipients based on frequency
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

        // ─── Build email content ───
        const periodLabel = days === 1 ? 'las últimas 24 horas' : `los últimos ${days} días`;
        const usersList = (usersResult.data as NewUser[]) || [];
        const reportsList = (reportsResult.data as ReportSummary[]) || [];
        const messagingData = ((messagingResult.data as MessagingActivity[]) || [])[0] || null;
        const messagingByCountry = (messagingByCountryResult.data as MessagingByCountry[]) || [];
        const listingsByCountry = (listingsByCountryResult.data as ListingsByCountry[]) || [];

        let usersHtml: string;
        if (usersList.length === 0) {
            // Show all countries with 0
            usersHtml = SUPPORTED_COUNTRIES.map(country => `
              <div style="margin-bottom: 16px;">
                <h3 style="font-size: 15px; color: #374151; margin: 0 0 8px 0;">
                  ${country.flag} ${country.name} — <span style="color: #6b7280;">0 nuevos</span>
                </h3>
              </div>
            `).join('');
        } else {
            // Group users by country
            const usersByCountry = new Map<string, NewUser[]>();
            for (const user of usersList) {
                const code = user.country_code || 'ES';
                if (!usersByCountry.has(code)) usersByCountry.set(code, []);
                usersByCountry.get(code)!.push(user);
            }

            // Build HTML for all supported countries (even those with 0 users)
            usersHtml = `
              <p style="color: #4b5563; margin-bottom: 16px;">
                Se han registrado <strong>${usersList.length}</strong> nuevos usuarios en ${periodLabel}:
              </p>
            `;

            for (const country of SUPPORTED_COUNTRIES) {
                const countryUsers = usersByCountry.get(country.code) || [];
                
                usersHtml += `
                  <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 15px; color: #374151; margin: 0 0 8px 0; padding: 8px 12px; background: #f3f4f6; border-radius: 6px;">
                      ${country.flag} ${country.name} — <strong>${countryUsers.length}</strong> ${countryUsers.length === 1 ? 'nuevo' : 'nuevos'}
                    </h3>
                `;

                if (countryUsers.length === 0) {
                    usersHtml += `
                    <p style="color: #9ca3af; font-style: italic; padding: 8px 12px; font-size: 13px;">
                      Sin actividad
                    </p>
                  </div>
                    `;
                } else {
                    usersHtml += `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                      <thead>
                        <tr style="background: #f9fafb;">
                          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Nickname</th>
                          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Email</th>
                          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Anuncios</th>
                          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Álbumes</th>
                          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Mensajes</th>
                          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${countryUsers.map((user, i) => `
                          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 13px;">${escapeHtml(user.nickname)}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${escapeHtml(user.email)}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${user.listings_count}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${user.albums_count}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${user.chat_messages_count}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                    `;
                }
            }
        }

        // ── Section 2: Reports ──
        const pendingReports = reportsList.filter(r => r.status === 'pending');
        let reportsHtml: string;
        if (reportsList.length === 0) {
            reportsHtml = `
        <p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">
          No hay nuevos reportes en ${periodLabel}.
        </p>
      `;
        } else {
            reportsHtml = `
        <p style="color: #4b5563; margin-bottom: 16px;">
          <strong>${reportsList.length}</strong> ${reportsList.length === 1 ? 'nuevo reporte' : 'nuevos reportes'} en ${periodLabel}${pendingReports.length > 0 ? ` (<strong style="color: #dc2626;">${pendingReports.length} pendientes</strong>)` : ''}:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Tipo</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Objetivo</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Motivo</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Reportado por</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Estado</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${reportsList.map((report, i) => `
              <tr style="background: ${report.status === 'pending' ? '#fef2f2' : i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${getTargetTypeLabel(report.target_type)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(report.target_label || '')}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${getReasonLabel(report.reason)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${escapeHtml(report.reporter_nickname || 'Desconocido')}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px;">${getStatusIndicator(report.status)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${new Date(report.created_at).toLocaleDateString('es-ES')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
        }

        // ── Section 3: Messaging Activity ──
        let messagingHtml: string;
        if (!messagingData || messagingData.total_messages === 0) {
            messagingHtml = `
        <p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">
          No hubo actividad de mensajes en ${periodLabel}.
        </p>
      `;
        } else {
            const topSenders = messagingData.top_senders || [];
            const busiestHourStr = messagingData.busiest_hour !== null
                ? `${String(messagingData.busiest_hour).padStart(2, '0')}:00 UTC`
                : 'N/A';

            messagingHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; min-width: 100px; background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">${messagingData.total_messages}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Mensajes</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${messagingData.unique_senders}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Remitentes</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #fffbeb; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">${messagingData.unique_conversations}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Conversaciones</div>
          </div>
          <div style="flex: 1; min-width: 100px; background: #fdf2f8; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #db2777;">${messagingData.messages_per_day}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Media/día</div>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">
          Hora más activa: <strong>${busiestHourStr}</strong> · Receptores únicos: <strong>${messagingData.unique_receivers}</strong>
        </p>
        ${topSenders.length > 0 ? `
        <p style="color: #4b5563; font-size: 13px; font-weight: 600; margin-bottom: 8px;">Top remitentes:</p>
        <table style="width: 100%; max-width: 400px; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Nickname</th>
              <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Mensajes</th>
            </tr>
          </thead>
          <tbody>
            ${topSenders.map((s: { nickname: string; message_count: number }, i: number) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${escapeHtml(s.nickname)}</td>
                <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 500;">${s.message_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      `;
        }

        // ── Section 3b: Country Messaging Breakdown ──
        let messagingCountryHtml = '';
        if (messagingByCountry.length > 0 || messagingData) {
            const countryMap = new Map(messagingByCountry.map(c => [c.country_code, c]));

            messagingCountryHtml = `
              <h3 style="font-size: 14px; color: #374151; margin: 20px 0 12px 0; font-weight: 600;">Desglose por país:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">País</th>
                    <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Mensajes</th>
                    <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Remitentes</th>
                    <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Conversaciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${SUPPORTED_COUNTRIES.map((country, i) => {
                      const data = countryMap.get(country.code);
                      return `
                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${country.flag} ${country.name}</td>
                          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px; ${!data ? 'color: #9ca3af;' : 'font-weight: 500;'}">${data ? data.total_messages : '0'}</td>
                          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px; ${!data ? 'color: #9ca3af;' : ''}">${data ? data.unique_senders : '0'}</td>
                          <td style="padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px; ${!data ? 'color: #9ca3af;' : ''}">${data ? data.unique_conversations : '0'}</td>
                        </tr>
                      `;
                  }).join('')}
                </tbody>
              </table>
            `;
        }
        // ── Section 4: New Listings by Country ──
        let listingsHtml: string;
        const totalListings = listingsByCountry.reduce((sum, c) => sum + c.total_listings, 0);
        if (totalListings === 0) {
            listingsHtml = SUPPORTED_COUNTRIES.map(country => `
              <div style="margin-bottom: 12px;">
                <h3 style="font-size: 15px; color: #374151; margin: 0 0 4px 0;">
                  ${country.flag} ${country.name} — <span style="color: #9ca3af;">0 anuncios</span>
                </h3>
              </div>
            `).join('');
        } else {
            const listingsMap = new Map(listingsByCountry.map(c => [c.country_code, c]));

            listingsHtml = `
              <p style="color: #4b5563; margin-bottom: 16px;">
                Se han publicado <strong>${totalListings}</strong> ${totalListings === 1 ? 'nuevo anuncio' : 'nuevos anuncios'} en ${periodLabel}:
              </p>
            `;

            for (const country of SUPPORTED_COUNTRIES) {
                const data = listingsMap.get(country.code);
                const count = data ? data.total_listings : 0;

                listingsHtml += `
                  <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 15px; color: #374151; margin: 0 0 8px 0; padding: 8px 12px; background: #f3f4f6; border-radius: 6px;">
                      ${country.flag} ${country.name} — <strong>${count}</strong> ${count === 1 ? 'anuncio' : 'anuncios'}
                    </h3>
                `;

                if (!data || count === 0) {
                    listingsHtml += `
                    <p style="color: #9ca3af; font-style: italic; padding: 8px 12px; font-size: 13px;">
                      Sin actividad
                    </p>
                  </div>
                    `;
                } else {
                    // Aggregate by user: count listings per nickname
                    const userAgg = new Map<string, { count: number; titles: string[] }>();
                    for (const item of data.users) {
                        const existing = userAgg.get(item.nickname);
                        if (existing) {
                            existing.count++;
                            if (existing.titles.length < 3) existing.titles.push(item.title || item.collection_name || '');
                        } else {
                            userAgg.set(item.nickname, { count: 1, titles: [item.title || item.collection_name || ''] });
                        }
                    }

                    listingsHtml += `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                      <thead>
                        <tr style="background: #f9fafb;">
                          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Usuario</th>
                          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Anuncios</th>
                          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280;">Ejemplos</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Array.from(userAgg.entries()).map(([nickname, info], i) => `
                          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; font-size: 13px;">${escapeHtml(nickname)}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">${info.count}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${info.titles.filter(Boolean).map(t => escapeHtml(t)).join(', ')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                    `;
                }
            }
        }

        const frequencyLabel = frequency === 'daily' ? 'Diario' : frequency === 'weekly' ? 'Semanal' : 'Manual';
        const subject = `[CambioCromos] Resumen de actividad - ${frequencyLabel}`;

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
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Resumen de Actividad</p>
          </div>
          <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
            <!-- Users Section -->
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; margin-bottom: 20px;">
              👥 Nuevos Usuarios (${periodLabel})
            </h2>
            ${usersHtml}

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <!-- New Listings Section -->
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; margin-bottom: 20px;">
              📦 Nuevos Anuncios (${periodLabel})
            </h2>
            ${listingsHtml}

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <!-- Reports Section -->
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; margin-bottom: 20px;">
              📋 Reportes${pendingReports.length > 0 ? ` <span style="background: #dc2626; color: white; font-size: 12px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">${pendingReports.length} pendientes</span>` : ''}
            </h2>
            ${reportsHtml}

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <!-- Messaging Activity Section -->
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; margin-bottom: 20px;">
              💬 Actividad de Mensajes (${periodLabel})
            </h2>
            ${messagingHtml}
            ${messagingCountryHtml}
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
                        text: stripHtml(htmlContent),
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

        console.log('[send-user-summary-email] Complete:', {
            sentCount,
            newUsers: usersList.length,
            reports: reportsList.length,
            pendingReports: pendingReports.length,
            totalMessages: messagingData?.total_messages ?? 0,
            errorCount: errors.length,
        });

        return new Response(
            JSON.stringify({
                success: true,
                sent_count: sentCount,
                new_users_count: usersList.length,
                reports_count: reportsList.length,
                pending_reports_count: pendingReports.length,
                total_messages: messagingData?.total_messages ?? 0,
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
