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

function buildExpirationEmailHtml(listings: StaleListing[]): string {
  const listingRows = listings
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

  const myListingsUrl = `${BASE_URL}/es/marketplace/my-listings`;

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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CambioCromos</h1>
        </div>
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
              ${listingRows}
            </tbody>
          </table>

          <div class="warning-box">
            <p>⚠️ Para mantener tus anuncios activos, solo tienes que hacer clic en <strong>Reactivar</strong> desde la página de Mis Anuncios.</p>
          </div>

          <div style="text-align: center;">
            <a href="${escapeHtml(myListingsUrl)}" class="button">Ir a Mis Anuncios</a>
          </div>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático de CambioCromos</p>
          <p>Si no deseas recibir estos correos, puedes ajustar tus preferencias en la configuración de la app</p>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (_req) => {
  const startTime = Date.now();
  const results = {
    expired: 0,
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
    // Step 3: Group by user and send batched emails
    // ================================================================
    console.log('[process-listing-expiration] Step 3: Sending warning emails...');

    // Group listings by user_id
    const listingsByUser = new Map<string, StaleListing[]>();
    for (const listing of staleListings) {
      const existing = listingsByUser.get(listing.user_id) || [];
      existing.push(listing);
      listingsByUser.set(listing.user_id, existing);
    }

    // Fetch emails for all affected users
    const userIds = Array.from(listingsByUser.keys());
    const { data: usersWithEmails, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);

    if (usersError) {
      console.error('[process-listing-expiration] Error fetching user profiles:', usersError);
      results.errors.push(`Users step: ${usersError.message}`);
    }

    // Fetch actual emails from auth.users via service role
    const userEmailMap = new Map<string, string>();
    if (usersWithEmails) {
      for (const profile of usersWithEmails) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser?.user?.email) {
          userEmailMap.set(profile.id, authUser.user.email);
        }
      }
    }

    // Check Resend API key
    if (!RESEND_API_KEY) {
      console.error('[process-listing-expiration] Resend API key not configured');
      results.errors.push('Resend API key not configured');
    } else {
      // Send one email per user with all their expiring listings
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

        const htmlContent = buildExpirationEmailHtml(userListings);
        const listingCount = userListings.length;
        const subject = listingCount === 1
          ? 'Tu anuncio va a caducar en 5 días'
          : `${listingCount} anuncios van a caducar en 5 días`;

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
            results.emailErrors++;
          } else {
            console.log(`[process-listing-expiration] Email sent to ${userEmail}:`, resendResult);
            results.emailsSent++;

            // Log the send
            await supabase.from('email_send_log').insert({
              user_id: userId,
              notification_kind: 'listing_expiration_warning',
            });
          }
        } catch (emailError) {
          console.error(`[process-listing-expiration] Email error for ${userEmail}:`, emailError);
          results.emailErrors++;
        }
      }
    }

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
