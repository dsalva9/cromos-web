import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const APP_URL = 'https://cambiocromos.com';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'Missing listing_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-instant-alert] Processing alerts for listing ${listing_id}`);

    // Fetch listing details
    const { data: listing, error: listingError } = await supabase
      .from('trade_listings')
      .select('id, title, sticker_number, collection_name')
      .eq('id', listing_id)
      .maybeSingle();

    if (listingError || !listing) {
      console.error(`[process-instant-alert] Listing ${listing_id} not found or query error:`, listingError);
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Match against instant alerts
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_listing_against_instant_alerts',
      { p_listing_id: listing_id }
    );

    if (matchError) {
      console.error('[process-instant-alert] Error running match RPC:', matchError);
      return new Response(JSON.stringify({ error: 'Error matching alerts', details: matchError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!matches || matches.length === 0) {
      console.log(`[process-instant-alert] No matching instant alerts found for listing ${listing_id}`);
      return new Response(JSON.stringify({ success: true, matches: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-instant-alert] Found ${matches.length} matching alerts`);

    const results = [];

    for (const match of matches) {
      const {
        alert_id,
        alert_user_id,
        alert_search_query,
        alert_collection_name,
        alert_slot_info,
        channel_email,
        channel_push,
        channel_in_app,
      } = match;

      console.log(`[process-instant-alert] Alert ${alert_id} matches. User: ${alert_user_id}. Channels: in_app=${channel_in_app}, email=${channel_email}, push=${channel_push}`);

      // 1. Mark as matched in the database
      const { error: insertMatchError } = await supabase
        .from('marketplace_alert_matches')
        .insert({
          alert_id,
          listing_id,
          notified_at: new Date().toISOString(),
        });

      if (insertMatchError) {
        console.error(`[process-instant-alert] Error inserting match for alert ${alert_id}:`, insertMatchError);
        // Continue to notify anyway, or skip to avoid duplicate notifications if retried? Let's check.
        // If it's a unique constraint violation, it means we already matched/notified, so skip.
        if (insertMatchError.code === '23505') {
          console.log(`[process-instant-alert] Alert ${alert_id} already notified for listing ${listing_id}. Skipping.`);
          continue;
        }
      }

      // 2. Update alert state
      await supabase
        .from('marketplace_alerts')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', alert_id);

      // Build specific message details
      let criteria = '';
      if (alert_slot_info && alert_collection_name) {
        criteria = `cromo ${alert_slot_info} de ${alert_collection_name}`;
      } else if (alert_collection_name) {
        criteria = `colección ${alert_collection_name}`;
      } else if (alert_search_query) {
        criteria = `búsqueda "${alert_search_query}"`;
      }

      const alertDetails = criteria ? ` para tu alerta de ${criteria}` : ' que coincide con tus alertas';
      const notificationTitle = `🔔 Nuevo cromo: "${listing.title}"`;
      const notificationBody = `Se ha publicado un nuevo cromo${alertDetails}. ¡Entra a ver el anuncio!`;
      const actionUrl = `${APP_URL}/marketplace/${listing_id}`;

      // 3. In-App Notification (insert into notifications table)
      // Note: Triggers on notifications table are bypassed for 'marketplace_alert' kinds,
      // so inserting here only creates the in-app record.
      if (channel_in_app) {
        const { error: inAppError } = await supabase
          .from('notifications')
          .insert({
            user_id: alert_user_id,
            kind: 'marketplace_alert',
            listing_id,
            payload: {
              alert_id,
              search_query: alert_search_query,
              collection_name: alert_collection_name,
              slot_info: alert_slot_info,
            },
          });

        if (inAppError) {
          console.error(`[process-instant-alert] Error creating in-app notification for user ${alert_user_id}:`, inAppError);
        } else {
          console.log(`[process-instant-alert] Created in-app notification for user ${alert_user_id}`);
        }
      }

      // 4. Email Notification
      if (channel_email) {
        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: alert_user_id,
              notification_kind: 'marketplace_alert',
              title: notificationTitle,
              body: notificationBody,
              data: {
                action_url: actionUrl,
                alert_id,
              },
            }),
          });

          if (!emailResponse.ok) {
            const errResult = await emailResponse.json();
            console.error(`[process-instant-alert] Error calling send-email-notification for user ${alert_user_id}:`, errResult);
          } else {
            console.log(`[process-instant-alert] Sent email notification request for user ${alert_user_id}`);
          }
        } catch (emailErr) {
          console.error(`[process-instant-alert] Exception calling send-email-notification:`, emailErr);
        }
      }

      // 5. Push Notification
      if (channel_push) {
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: alert_user_id,
              notification_kind: 'marketplace_alert',
              title: notificationTitle,
              body: notificationBody,
              data: {
                action_url: actionUrl,
                alert_id,
              },
            }),
          });

          if (!pushResponse.ok) {
            const errResult = await pushResponse.json();
            console.error(`[process-instant-alert] Error calling send-push-notification for user ${alert_user_id}:`, errResult);
          } else {
            console.log(`[process-instant-alert] Sent push notification request for user ${alert_user_id}`);
          }
        } catch (pushErr) {
          console.error(`[process-instant-alert] Exception calling send-push-notification:`, pushErr);
        }
      }

      results.push({ alert_id, status: 'processed' });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-instant-alert] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
