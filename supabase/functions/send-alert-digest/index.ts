import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';
const APP_URL = 'https://cambiocromos.com';

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface DigestRow {
  alert_id: number;
  alert_user_id: string;
  alert_search_query: string | null;
  alert_collection_name: string | null;
  alert_slot_info: string | null;
  channel_email: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  listing_id: number;
  listing_title: string;
  listing_collection_name: string | null;
  listing_sticker_number: string | null;
  listing_image_url: string | null;
  listing_author_nickname: string | null;
  listing_created_at: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.error('[send-alert-digest] Resend API key not configured');
      return new Response(JSON.stringify({ error: 'Resend not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { frequency } = await req.json();
    if (!frequency || (frequency !== 'daily' && frequency !== 'weekly')) {
      return new Response(JSON.stringify({ error: 'Invalid or missing frequency (must be daily or weekly)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-alert-digest] Starting ${frequency} digest processing...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all digest alert matches
    const { data: rawRows, error: queryError } = await supabase.rpc(
      'get_digest_alert_matches',
      { p_frequency: frequency }
    );

    if (queryError) {
      console.error('[send-alert-digest] Error fetching digest matches:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to query digest matches', details: queryError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = (rawRows || []) as DigestRow[];
    if (rows.length === 0) {
      console.log(`[send-alert-digest] No digest matches found for frequency: ${frequency}`);
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No matches found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-alert-digest] Found ${rows.length} matches. Grouping by user...`);

    // 2. Group by user
    const usersMap = new Map<string, {
      userId: string;
      email: string | null;
      nickname: string;
      isSuspended: boolean;
      deletedAt: string | null;
      alerts: Map<number, {
        alertId: number;
        searchQuery: string | null;
        collectionName: string | null;
        slotInfo: string | null;
        channelEmail: boolean;
        channelPush: boolean;
        channelInApp: boolean;
        listings: {
          id: number;
          title: string;
          collectionName: string | null;
          stickerNumber: string | null;
          imageUrl: string | null;
          authorNickname: string | null;
          createdAt: string;
        }[];
      }>;
    }>();

    for (const row of rows) {
      let userData = usersMap.get(row.alert_user_id);
      if (!userData) {
        // Fetch user profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, is_suspended, deleted_at')
          .eq('id', row.alert_user_id)
          .maybeSingle();

        // Fetch user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(row.alert_user_id);
        const email = authUser?.user?.email ?? null;

        userData = {
          userId: row.alert_user_id,
          email,
          nickname: profile?.nickname || 'Coleccionista',
          isSuspended: profile?.is_suspended || false,
          deletedAt: profile?.deleted_at || null,
          alerts: new Map(),
        };
        usersMap.set(row.alert_user_id, userData);
      }

      // Skip suspended/deleted users
      if (userData.isSuspended || userData.deletedAt) continue;

      let alertData = userData.alerts.get(row.alert_id);
      if (!alertData) {
        alertData = {
          alertId: row.alert_id,
          searchQuery: row.alert_search_query,
          collectionName: row.alert_collection_name,
          slotInfo: row.alert_slot_info,
          channelEmail: row.channel_email,
          channelPush: row.channel_push,
          channelInApp: row.channel_in_app,
          listings: [],
        };
        userData.alerts.set(row.alert_id, alertData);
      }

      // Deduplicate listing matching same alert
      if (!alertData.listings.some(l => l.id === row.listing_id)) {
        alertData.listings.push({
          id: row.listing_id,
          title: row.listing_title,
          collectionName: row.listing_collection_name,
          stickerNumber: row.listing_sticker_number,
          imageUrl: row.listing_image_url,
          authorNickname: row.listing_author_nickname,
          createdAt: row.listing_created_at,
        });
      }
    }

    console.log(`[send-alert-digest] Grouped matches into ${usersMap.size} users. Processing notifications...`);

    let sent = 0;
    let errors = 0;

    for (const [userId, userData] of usersMap) {
      if (userData.isSuspended || userData.deletedAt) continue;

      // Group matching listings for the notifications
      const userAlertList = Array.from(userData.alerts.values());
      const totalMatches = userAlertList.reduce((acc, a) => acc + a.listings.length, 0);

      if (totalMatches === 0) continue;

      // Channels enabled for any alert of this user
      const anyInApp = userAlertList.some(a => a.channelInApp);
      const anyEmail = userAlertList.some(a => a.channelEmail) && userData.email;
      const anyPush = userAlertList.some(a => a.channelPush);

      console.log(`[send-alert-digest] User ${userData.nickname} (${userId}) has ${totalMatches} matches. Channels: in_app=${anyInApp}, email=${anyEmail}, push=${anyPush}`);

      // 3. Insert matches in DB & update digest status
      const matchInserts = [];
      const alertIdsToUpdate = [];

      for (const alert of userAlertList) {
        alertIdsToUpdate.push(alert.alertId);
        for (const listing of alert.listings) {
          matchInserts.push({
            alert_id: alert.alertId,
            listing_id: listing.id,
            notified_at: new Date().toISOString(),
          });
        }
      }

      if (matchInserts.length > 0) {
        const { error: insertErr } = await supabase
          .from('marketplace_alert_matches')
          .insert(matchInserts);
        if (insertErr) {
          console.error(`[send-alert-digest] Error inserting matches for user ${userId}:`, insertErr);
        }
      }

      if (alertIdsToUpdate.length > 0) {
        await supabase
          .from('marketplace_alerts')
          .update({ last_digest_at: new Date().toISOString() })
          .in('id', alertIdsToUpdate);
      }

      // 4. In-App Notification
      if (anyInApp) {
        const { error: inAppError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            kind: 'marketplace_alert_digest',
            payload: {
              count: totalMatches,
              frequency,
            },
          });

        if (inAppError) {
          console.error(`[send-alert-digest] Error creating in-app digest notification for user ${userId}:`, inAppError);
        } else {
          console.log(`[send-alert-digest] Created in-app notification for user ${userId}`);
        }
      }

      // 5. Push Notification
      if (anyPush) {
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: userId,
              notification_kind: 'marketplace_alert_digest',
              title: `📋 Resumen ${frequency === 'daily' ? 'diario' : 'semanal'} de alertas`,
              body: `Hemos encontrado ${totalMatches} nuevos cromos que coinciden con tus alertas.`,
              data: {
                action_url: `${APP_URL}/alertas`,
              },
            }),
          });

          if (!pushResponse.ok) {
            const errResult = await pushResponse.json();
            console.error(`[send-alert-digest] Error calling send-push-notification for user ${userId}:`, errResult);
          }
        } catch (pushErr) {
          console.error(`[send-alert-digest] Exception calling send-push-notification:`, pushErr);
        }
      }

      // 6. Email Notification (direct Resend call for custom HTML formatting)
      if (anyEmail && userData.email) {
        // Bounce suppression check
        const { data: bounceRecord } = await supabase
          .from('email_bounces')
          .select('suppressed')
          .eq('email', userData.email)
          .eq('suppressed', true)
          .maybeSingle();

        if (bounceRecord) {
          console.log(`[send-alert-digest] Email skipped (bounced/suppressed) for user ${userData.nickname} (${userData.email})`);
          continue;
        }

        // Build premium email HTML
        const frequencyLabel = frequency === 'daily' ? 'diario' : 'semanal';
        const subject = `📋 Tu resumen ${frequencyLabel}: ${totalMatches} nuevos cromos coinciden con tus alertas`;

        let alertsHtml = '';
        for (const alert of userAlertList) {
          // Skip alerts with channel_email disabled
          if (!alert.channelEmail) continue;

          let criteriaLabel = '';
          if (alert.slotInfo && alert.collectionName) {
            criteriaLabel = `Cromo ${alert.slotInfo} de ${alert.collectionName}`;
          } else if (alert.collectionName) {
            criteriaLabel = `Colección ${alert.collectionName}`;
          } else if (alert.searchQuery) {
            criteriaLabel = `Búsqueda "${alert.searchQuery}"`;
          } else {
            criteriaLabel = 'Tus criterios guardados';
          }

          let listingsCards = '';
          for (const listing of alert.listings) {
            const listingUrl = `${APP_URL}/marketplace/${listing.id}`;
            const imgHtml = listing.imageUrl
              ? `<img src="${escapeHtml(listing.imageUrl)}" alt="${escapeHtml(listing.title)}" style="width: 80px; height: 100px; object-fit: cover; border-radius: 4px; margin-right: 16px;" />`
              : `<div style="width: 80px; height: 100px; background: #e5e7eb; border-radius: 4px; margin-right: 16px; display: inline-block; vertical-align: top;"></div>`;

            listingsCards += `
              <div style="display: flex; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                ${imgHtml}
                <div style="flex: 1;">
                  <h4 style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px; font-weight: bold;">${escapeHtml(listing.title)}</h4>
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                    ${listing.collectionName ? `Colección: ${escapeHtml(listing.collectionName)}` : ''}
                    ${listing.stickerNumber ? ` · Cromo: #${escapeHtml(listing.stickerNumber)}` : ''}
                  </p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #4b5563; font-size: 13px;">Publicado por: <strong>${escapeHtml(listing.authorNickname || 'Usuario')}</strong></span>
                    <a href="${listingUrl}" style="display: inline-block; padding: 6px 12px; background: #FFC000; color: #000000; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">Ver anuncio</a>
                  </div>
                </div>
              </div>
            `;
          }

          alertsHtml += `
            <div style="margin-top: 24px; margin-bottom: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">
              <h3 style="margin: 0; color: #FF8C00; font-size: 18px; font-weight: bold;">🎯 ${escapeHtml(criteriaLabel)}</h3>
            </div>
            ${listingsCards}
          `;
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #FFC000 0%, #FF8C00 100%); color: white; padding: 35px 20px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.05em;">CambioCromos</h1>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Tu resumen ${frequencyLabel} de alertas</p>
              </div>
              <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <p style="color: #1f2937; font-size: 18px; margin-top: 0; font-weight: bold;">¡Hola ${escapeHtml(userData.nickname)}! 👋</p>
                <p style="color: #4b5563; margin-bottom: 20px;">Hemos recopilado los nuevos anuncios publicados en el marketplace que coinciden con los criterios de tus alertas activas.</p>
                
                ${alertsHtml}

                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="${APP_URL}/alertas" style="display: inline-block; padding: 12px 28px; background: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);">Gestionar mis alertas</a>
                </div>
              </div>
              <div style="padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
                <p style="margin: 0;">Este es un correo automático enviado por CambioCromos.</p>
                <p style="margin: 6px 0 0 0;">Puedes cambiar la frecuencia o canales de tus alertas en la sección <a href="${APP_URL}/alertas" style="color: #FF8C00; text-decoration: underline;">Alertas</a>.</p>
              </div>
            </body>
          </html>
        `;

        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: userData.email,
              subject: subject,
              html: emailHtml,
              text: stripHtml(emailHtml),
            }),
          });

          if (resendResponse.ok) {
            sent++;
            console.log(`[send-alert-digest] ✓ Digest email sent to ${userData.nickname} (${userData.email})`);
          } else {
            const errorBody = await resendResponse.json();
            errors++;
            console.error(`[send-alert-digest] ✗ Resend failed for user ${userData.nickname}:`, errorBody);
          }
        } catch (resendErr) {
          errors++;
          console.error(`[send-alert-digest] ✗ Error calling Resend for user ${userData.nickname}:`, resendErr);
        }

        // Rate limiting: 600ms delay between sending emails
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    return new Response(JSON.stringify({ success: true, sent, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-alert-digest] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
