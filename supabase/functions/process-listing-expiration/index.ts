import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: process-listing-expiration
 * Daily cron job that:
 * 1. Expires listings whose expiry_scheduled_at has passed
 * 2. Flags stale listings (inactive 25+ days) and sends warning emails
 * 3. Updates flagged listings with expiry schedule
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';
const BASE_URL = 'https://cambiocromos.com';

/**
 * Escapes HTML special characters to prevent XSS injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

interface StaleListing {
  id: number;
  title: string;
  user_id: string;
}

interface UserEmail {
  user_id: string;
  email: string;
}

/**
 * Common email shell used by both warning and removal emails.
 */
function emailShell(headerColor: string, body: string): string {
  return `
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
            background: ${headerColor};
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          .warning-box {
            background: #FFF7ED;
            border: 1px solid #FB923C;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
          }
          .warning-box p {
            color: #9A3412;
            margin: 0;
          }
          .info-box {
            background: #EFF6FF;
            border: 1px solid #60A5FA;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
          }
          .info-box p {
            color: #1E40AF;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CambioCromos</h1>
        </div>
        ${body}
        <div class="footer">
          <p>Este es un mensaje automático de CambioCromos</p>
          <p>Si no deseas recibir estos correos, puedes ajustar tus preferencias en la configuración de la app</p>
        </div>
      </body>
    </html>
  `;
}

function buildListingRows(listings: StaleListing[]): string {
  return listings
    .map((listing) => {
      const listingUrl = `${BASE_URL}/es/marketplace/${listing.id}`;
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <a href="${escapeHtml(listingUrl)}" style="color: #1f2937; text-decoration: none; font-weight: 500;">${escapeHtml(listing.title)}</a>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <a href="${escapeHtml(listingUrl)}" style="color: #FFC000; text-decoration: none; font-weight: bold;">Ver →</a>
          </td>
        </tr>`;
    })
    .join('');
}

function buildExpirationEmailHtml(listings: StaleListing[]): string {
  const myListingsUrl = `${BASE_URL}/es/marketplace/my-listings`;
  const body = `
    <div class="content">
      <h2>⏰ Tus anuncios van a caducar</h2>
      <p>Hola,</p>
      <p>Los siguientes anuncios llevan más de 25 días sin actividad y serán <strong>eliminados automáticamente en 5 días</strong> si no los reactivas:</p>
      <table>
        <thead>
          <tr>
            <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Anuncio</th>
            <th style="padding: 12px 16px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Enlace</th>
          </tr>
        </thead>
        <tbody>
          ${buildListingRows(listings)}
        </tbody>
      </table>
      <div class="warning-box">
        <p>⚠️ Para mantener tus anuncios activos, solo tienes que hacer clic en <strong>Reactivar</strong> desde la página de Mis Anuncios.</p>
      </div>
      <div style="text-align: center;">
        <a href="${escapeHtml(myListingsUrl)}" class="button">Ir a Mis Anuncios</a>
      </div>
    </div>`;
  return emailShell('linear-gradient(135deg, #FFC000 0%, #FF8C00 100%)', body);
}

function buildRemovalEmailHtml(listings: StaleListing[]): string {
  const myListingsUrl = `${BASE_URL}/es/marketplace/my-listings`;
  const body = `
    <div class="content">
      <h2>🗑️ Tus anuncios han sido eliminados</h2>
      <p>Hola,</p>
      <p>Los siguientes anuncios han sido movidos a <strong>Eliminados</strong> por inactividad:</p>
      <table>
        <thead>
          <tr>
            <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Anuncio</th>
            <th style="padding: 12px 16px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Enlace</th>
          </tr>
        </thead>
        <tbody>
          ${buildListingRows(listings)}
        </tbody>
      </table>
      <div class="info-box">
        <p>ℹ️ Puedes ver y <strong>restaurar</strong> estos anuncios desde la pestaña "Eliminados" en <strong>Mis Anuncios</strong>.</p>
      </div>
      <div class="warning-box">
        <p>⚠️ Si no los restauras, serán <strong>eliminados permanentemente</strong> de acuerdo con nuestra política de retención de datos.</p>
      </div>
      <div style="text-align: center;">
        <a href="${escapeHtml(myListingsUrl)}" class="button">Ir a Mis Anuncios</a>
      </div>
    </div>`;
  return emailShell('linear-gradient(135deg, #DC2626 0%, #991B1B 100%)', body);
}

/**
 * Sends one batched email per user for a list of listings.
 * Returns { sent, errors } counts.
 */
async function sendBatchedEmails(
  supabase: ReturnType<typeof createClient>,
  listingsByUser: Map<string, StaleListing[]>,
  buildHtml: (listings: StaleListing[]) => string,
  buildSubject: (count: number) => string,
  notificationKind: string,
): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  if (!RESEND_API_KEY) {
    console.error('[process-listing-expiration] Resend API key not configured');
    return { sent, errors: listingsByUser.size };
  }

  // Collect all user IDs and fetch emails
  const userIds = Array.from(listingsByUser.keys());
  const userEmailMap = new Map<string, string>();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .in('id', userIds);

  if (profiles) {
    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        userEmailMap.set(profile.id, authUser.user.email);
      }
    }
  }

  for (const [userId, userListings] of listingsByUser.entries()) {
    const userEmail = userEmailMap.get(userId);
    if (!userEmail) {
      console.log(`[process-listing-expiration] No email for user ${userId}, skipping`);
      continue;
    }

    // Check bounce suppression
    const { data: bounceRecord } = await supabase
      .from('email_bounces')
      .select('suppressed')
      .eq('email', userEmail)
      .eq('suppressed', true)
      .maybeSingle();

    if (bounceRecord) {
      console.log(`[process-listing-expiration] Skipping suppressed email: ${userEmail}`);
      continue;
    }

    const htmlContent = buildHtml(userListings);
    const subject = buildSubject(userListings.length);

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: userEmail,
          subject,
          html: htmlContent,
          text: stripHtml(htmlContent),
        }),
      });

      const resendResult = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error(`[process-listing-expiration] Resend error for ${userEmail}:`, resendResult);
        errors++;
      } else {
        console.log(`[process-listing-expiration] Email sent to ${userEmail}:`, resendResult);
        sent++;

        await supabase.from('email_send_log').insert({
          user_id: userId,
          notification_kind: notificationKind,
        });
      }
    } catch (emailError) {
      console.error(`[process-listing-expiration] Email error for ${userEmail}:`, emailError);
      errors++;
    }
  }

  return { sent, errors };
}

Deno.serve(async (_req) => {
  const startTime = Date.now();
  const results = {
    expired: 0,
    expiredEmailsSent: 0,
    expiredEmailErrors: 0,
    flagged: 0,
    emailsSent: 0,
    emailErrors: 0,
    errors: [] as string[],
  };

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ================================================================
    // Step 1: Expire listings whose expiry_scheduled_at has passed
    // ================================================================
    console.log('[process-listing-expiration] Step 1: Expiring overdue listings...');

    const { data: expiredListings, error: expireError } = await supabase
      .from('trade_listings')
      .update({
        status: 'removed',
        deleted_at: new Date().toISOString(),
      })
      .eq('status', 'active')
      .is('deleted_at', null)
      .lte('expiry_scheduled_at', new Date().toISOString())
      .select('id, title, user_id');

    if (expireError) {
      console.error('[process-listing-expiration] Error expiring listings:', expireError);
      results.errors.push(`Expire step: ${expireError.message}`);
    } else {
      results.expired = expiredListings?.length ?? 0;
      console.log(`[process-listing-expiration] Expired ${results.expired} listings`);

      // Insert expired listings into retention_schedule
      if (expiredListings && expiredListings.length > 0) {
        console.log(`[process-listing-expiration] Inserting ${expiredListings.length} items into retention_schedule...`);
        const retentionRows = expiredListings.map((l) => ({
          entity_type: 'listing',
          entity_id: String(l.id),
          action: 'delete',
          scheduled_for: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'expired',
          initiated_by_type: 'system',
        }));

        const { error: retentionError } = await supabase
          .from('retention_schedule')
          .upsert(retentionRows, { onConflict: 'entity_type,entity_id,action' });

        if (retentionError) {
          console.error('[process-listing-expiration] Error inserting into retention_schedule:', retentionError);
          results.errors.push(`Retention schedule step: ${retentionError.message}`);
        }
      }
    }

    // ================================================================
    // Step 1B: Send removal notification emails for expired listings
    // ================================================================
    if (expiredListings && expiredListings.length > 0) {
      console.log('[process-listing-expiration] Step 1B: Sending removal notifications...');

      const expiredByUser = new Map<string, StaleListing[]>();
      for (const listing of expiredListings) {
        const existing = expiredByUser.get(listing.user_id) || [];
        existing.push(listing);
        expiredByUser.set(listing.user_id, existing);
      }

      const removalResult = await sendBatchedEmails(
        supabase,
        expiredByUser,
        buildRemovalEmailHtml,
        (count) => count === 1
          ? 'Tu anuncio ha sido eliminado por inactividad'
          : `${count} anuncios han sido eliminados por inactividad`,
        'listing_expiration_removed',
      );

      results.expiredEmailsSent = removalResult.sent;
      results.expiredEmailErrors = removalResult.errors;
    }

    // ================================================================
    // Step 2: Flag stale listings (inactive 25+ days, no warning yet)
    // ================================================================
    console.log('[process-listing-expiration] Step 2: Finding stale listings...');

    const twentyFiveDaysAgo = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleListings, error: staleError } = await supabase
      .from('trade_listings')
      .select('id, title, user_id')
      .eq('status', 'active')
      .is('deleted_at', null)
      .is('expiry_warning_sent_at', null)
      .lte('last_owner_interaction_at', twentyFiveDaysAgo);

    if (staleError) {
      console.error('[process-listing-expiration] Error finding stale listings:', staleError);
      results.errors.push(`Stale step: ${staleError.message}`);
      return new Response(
        JSON.stringify({ success: false, results, duration_ms: Date.now() - startTime }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!staleListings || staleListings.length === 0) {
      console.log('[process-listing-expiration] No stale listings found');
      return new Response(
        JSON.stringify({ success: true, results, duration_ms: Date.now() - startTime }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    results.flagged = staleListings.length;
    console.log(`[process-listing-expiration] Found ${results.flagged} stale listings`);

    // ================================================================
    // Step 3: Group by user and send batched warning emails
    // ================================================================
    console.log('[process-listing-expiration] Step 3: Sending warning emails...');

    // Group listings by user_id
    const listingsByUser = new Map<string, StaleListing[]>();
    for (const listing of staleListings) {
      const existing = listingsByUser.get(listing.user_id) || [];
      existing.push(listing);
      listingsByUser.set(listing.user_id, existing);
    }

    const warningResult = await sendBatchedEmails(
      supabase,
      listingsByUser,
      buildExpirationEmailHtml,
      (count) => count === 1
        ? 'Tu anuncio va a caducar en 5 días'
        : `${count} anuncios van a caducar en 5 días`,
      'listing_expiration_warning',
    );

    results.emailsSent = warningResult.sent;
    results.emailErrors = warningResult.errors;

    // ================================================================
    // Step 4: Update all flagged listings with expiry schedule
    // ================================================================
    console.log('[process-listing-expiration] Step 4: Updating flagged listings...');

    const now = new Date();
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const staleIds = staleListings.map((l) => l.id);

    const { error: updateError } = await supabase
      .from('trade_listings')
      .update({
        expiry_warning_sent_at: now.toISOString(),
        expiry_scheduled_at: fiveDaysLater.toISOString(),
      })
      .in('id', staleIds);

    if (updateError) {
      console.error('[process-listing-expiration] Error updating flagged listings:', updateError);
      results.errors.push(`Update step: ${updateError.message}`);
    } else {
      console.log(`[process-listing-expiration] Updated ${staleIds.length} listings with expiry schedule`);
    }

    const duration = Date.now() - startTime;
    console.log(`[process-listing-expiration] Complete in ${duration}ms:`, results);

    return new Response(
      JSON.stringify({ success: true, results, duration_ms: duration }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[process-listing-expiration] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message, results }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
