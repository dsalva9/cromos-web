import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: send-unread-digest
 * Sends a weekly digest email to users who have unread chat messages,
 * reminding them to check their inbox.
 *
 * Authentication:
 * - Cron triggers: No Authorization header needed (verify_jwt is disabled,
 *   cron calls come from the Supabase internal network via pg_net).
 * - Manual triggers: Uses Authorization header with service role key.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CambioCromos <info@cambiocromos.com>';
const APP_URL = 'https://cambiocromos.com';
const CHATS_URL = `${APP_URL}/chats`;

// Test users to exclude from the digest
const EXCLUDED_NICKNAMES = ['Indeciso', 'Furbolero', 'David', 'AlbertoCromos'];

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

interface UnreadUserRow {
  user_id: string;
  nickname: string;
  email: string;
  unread_count: number;
  sender_names: string[];
  oldest_unread: string;
  notification_preferences: Record<string, unknown> | null;
}

/** Check if a user should receive the digest based on their notification preferences */
function shouldSendDigest(prefs: Record<string, unknown> | null): boolean {
  // NULL or empty preferences → default opt-in
  if (!prefs || Object.keys(prefs).length === 0) return true;

  // If email_enabled is explicitly false → skip
  if (prefs.email_enabled === false) return false;

  // If granular preferences exist, check email.chat_unread
  const emailPrefs = prefs.email as Record<string, boolean> | undefined;
  if (emailPrefs && emailPrefs.chat_unread === false) return false;

  return true;
}

/** Build a dynamic subject line based on unread count */
function buildSubject(count: number, senderNames: string[]): string {
  if (count === 1 && senderNames.length > 0) {
    return `${senderNames[0]} te ha escrito en CambioCromos 💬`;
  }
  if (count <= 5) {
    return `Tienes ${count} mensajes esperándote 💬`;
  }
  return `¡${count} mensajes sin leer! No dejes escapar esos cromos 🔥`;
}

/** Build the sender names display string */
function buildSenderNamesDisplay(names: string[], max: number = 3): string {
  if (names.length <= max) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, max);
  const remaining = names.length - max;
  return `${shown.join(', ')} y ${remaining} más`;
}

/** Build the dynamic context line */
function buildContextLine(count: number, senderNames: string[], oldestUnread: string): string {
  const daysDiff = Math.max(
    1,
    Math.floor((Date.now() - new Date(oldestUnread).getTime()) / (1000 * 60 * 60 * 24))
  );
  const mensajeWord = count === 1 ? 'mensaje' : 'mensajes';

  if (count === 1 && senderNames.length === 1) {
    return `Tienes 1 mensaje de ${escapeHtml(senderNames[0])} desde hace ${daysDiff} ${daysDiff === 1 ? 'día' : 'días'}.`;
  }
  if (senderNames.length === 1) {
    return `Tienes ${count} ${mensajeWord} de ${escapeHtml(senderNames[0])}.`;
  }
  // 2+ senders
  const display = buildSenderNamesDisplay(senderNames.map(n => escapeHtml(n)));
  return `Tienes ${count} ${mensajeWord} de ${display}.`;
}

/** Build the intro line with correct singular/plural verb */
function buildIntroLine(senderNames: string[]): string {
  const display = buildSenderNamesDisplay(senderNames.map(n => escapeHtml(n)));
  const verb = senderNames.length === 1 ? 'te ha enviado' : 'te han enviado';
  return `${display} ${verb} mensajes sobre tus cromos y aún no los has leído.`;
}

/** Build the full HTML email content */
function buildEmailHtml(nickname: string, count: number, senderNames: string[], oldestUnread: string): string {
  const contextLine = buildContextLine(count, senderNames, oldestUnread);
  const introLine = buildIntroLine(senderNames);

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
      <p style="color: #1f2937; font-size: 18px; margin-top: 0;">¡Hola ${escapeHtml(nickname)}! 👋</p>
      <p style="color: #4b5563; margin: 16px 0;">${introLine}</p>
      <p style="color: #4b5563; margin: 16px 0;">${contextLine}</p>
      <p style="color: #4b5563; margin: 16px 0;">No les hagas esperar — ¡pueden tener justo lo que buscas!</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${CHATS_URL}" style="display: inline-block; padding: 12px 24px; background: #FFC000; color: #000000; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver mis mensajes</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin: 0;">Este es un recordatorio semanal de CambioCromos.</p>
      <p style="margin: 8px 0 0 0;">Puedes desactivar estos correos en la configuración de la app.</p>
    </div>
  </body>
</html>`;
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
      console.error('[send-unread-digest] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: hybrid pattern (cron = no header, manual = service role key)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      if (!authHeader.includes(supabaseServiceKey)) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
          console.error('[send-unread-digest] Auth failed:', userError?.message);
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
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
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      console.log('[send-unread-digest] Auth: manual/service-role trigger');
    } else {
      console.log('[send-unread-digest] Auth: cron trigger (no auth header)');
    }

    console.log('[send-unread-digest] Starting unread digest processing...');

    // Build the excluded nicknames filter for the SQL query
    const excludedList = EXCLUDED_NICKNAMES.map(n => `'${n}'`).join(', ');

    // Query: find all users with unread messages, aggregate sender info
    const { data: unreadUsers, error: queryError } = await supabase.rpc('execute_sql_raw' as never, {} as never).then(() => {
      // Fallback: use direct SQL via the service role client
      return { data: null, error: { message: 'Using direct query instead' } };
    });

    // Direct query approach — use the Supabase client to assemble the data
    // Step 1: Get all users with unread messages (excluding test/suspended/deleted users)
    const { data: unreadData, error: unreadError } = await supabase
      .from('trade_chats')
      .select(`
        receiver_id,
        sender_id,
        message,
        created_at,
        is_read,
        sender:profiles!trade_chats_sender_id_fkey(nickname),
        receiver:profiles!trade_chats_receiver_id_fkey(
          id,
          nickname,
          is_suspended,
          deleted_at,
          notification_preferences
        )
      `)
      .eq('is_read', false);

    if (unreadError) {
      console.error('[send-unread-digest] Error querying unread messages:', unreadError);
      return new Response(
        JSON.stringify({ error: 'Failed to query unread messages', details: unreadError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!unreadData || unreadData.length === 0) {
      console.log('[send-unread-digest] No unread messages found');
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, errors: 0, message: 'No unread messages' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Aggregate by receiver user
    const userMap = new Map<string, {
      user_id: string;
      nickname: string;
      unread_count: number;
      sender_names: Set<string>;
      oldest_unread: string;
      notification_preferences: Record<string, unknown> | null;
    }>();

    for (const row of unreadData) {
      const receiver = row.receiver as unknown as {
        id: string;
        nickname: string;
        is_suspended: boolean;
        deleted_at: string | null;
        notification_preferences: Record<string, unknown> | null;
      };
      const sender = row.sender as unknown as { nickname: string };

      if (!receiver || !receiver.id) continue;

      // Skip suspended, deleted, and test users
      if (receiver.is_suspended) continue;
      if (receiver.deleted_at) continue;
      if (EXCLUDED_NICKNAMES.includes(receiver.nickname)) continue;

      const existing = userMap.get(receiver.id);
      if (existing) {
        existing.unread_count++;
        if (sender?.nickname) existing.sender_names.add(sender.nickname);
        if (row.created_at < existing.oldest_unread) {
          existing.oldest_unread = row.created_at;
        }
      } else {
        const senderNames = new Set<string>();
        if (sender?.nickname) senderNames.add(sender.nickname);
        userMap.set(receiver.id, {
          user_id: receiver.id,
          nickname: receiver.nickname,
          unread_count: 1,
          sender_names: senderNames,
          oldest_unread: row.created_at,
          notification_preferences: receiver.notification_preferences,
        });
      }
    }

    console.log(`[send-unread-digest] Found ${userMap.size} users with unread messages`);

    // Step 3: Filter by notification preferences and get emails
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const [userId, userData] of userMap) {
      // Check notification preferences
      if (!shouldSendDigest(userData.notification_preferences)) {
        console.log(`[send-unread-digest] Skipped (prefs): ${userData.nickname}`);
        skipped++;
        continue;
      }

      // Get user email from auth.users via service role
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser?.user?.email) {
        console.log(`[send-unread-digest] Skipped (no email): ${userData.nickname}`);
        skipped++;
        continue;
      }

      const email = authUser.user.email;
      const senderNames = Array.from(userData.sender_names);

      if (senderNames.length === 0) {
        console.log(`[send-unread-digest] Skipped (no sender names): ${userData.nickname}`);
        skipped++;
        continue;
      }

      // Build email
      const subject = buildSubject(userData.unread_count, senderNames);
      const htmlContent = buildEmailHtml(
        userData.nickname,
        userData.unread_count,
        senderNames,
        userData.oldest_unread
      );

      // Send via Resend
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: subject,
            html: htmlContent,
            text: stripHtml(htmlContent),
          }),
        });

        if (resendResponse.ok) {
          sent++;
          console.log(`[send-unread-digest] ✓ Sent to ${userData.nickname} (${email}): ${userData.unread_count} unread from ${senderNames.join(', ')}`);
        } else {
          const errorBody = await resendResponse.json();
          errors++;
          console.error(`[send-unread-digest] ✗ Failed for ${userData.nickname} (${email}):`, errorBody);
        }
      } catch (err) {
        errors++;
        console.error(`[send-unread-digest] ✗ Error sending to ${userData.nickname}:`, err);
      }

      // Rate limiting: 600ms delay between sends
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const summary = { sent, skipped, errors };
    console.log('[send-unread-digest] Complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-unread-digest] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
