import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

interface ReportPayload {
  report_id: number;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  created_at: string;
}

interface ChatMessage {
  id: number;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  is_system: boolean;
  created_at: string;
}

/** Map report reason to a human-readable Spanish label */
function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    spam: 'Spam / Enlace externo',
    inappropriate_content: 'Contenido inapropiado',
    harassment: 'Acoso / Amenaza',
    copyright_violation: 'Violación de copyright',
    misleading_information: 'Información engañosa',
    fake_listing: 'Anuncio falso',
    offensive_language: 'Lenguaje ofensivo / Insultos',
    other: 'Otro motivo',
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
    message: 'Mensaje de Chat',
  };
  return labels[type] || type;
}

/** Render chat messages as styled HTML chat bubbles */
function renderChatHtml(
  messages: ChatMessage[],
  reporterNickname: string,
  targetNickname: string,
  reporterId: string
): string {
  if (!messages || messages.length === 0) {
    return `
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #374151;">💬 Conversación entre los usuarios</h3>
        <p style="margin: 0; font-size: 13px; color: #6b7280; font-style: italic;">No se encontraron mensajes entre estos usuarios.</p>
      </div>
    `;
  }

  let chatBubblesHtml = '';

  for (const msg of messages) {
    const timestamp = new Date(msg.created_at).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (msg.is_system) {
      // System message — centered, italic
      chatBubblesHtml += `
        <div style="text-align: center; margin: 6px 0;">
          <span style="font-size: 12px; color: #9ca3af; font-style: italic;">
            ${escapeHtml(msg.message || '[mensaje del sistema]')}
          </span>
          <br><span style="font-size: 10px; color: #d1d5db;">${timestamp}</span>
        </div>
      `;
    } else {
      const isReporter = msg.sender_id === reporterId;
      const senderName = isReporter ? reporterNickname : targetNickname;
      const alignment = isReporter ? 'right' : 'left';
      const bgColor = isReporter ? '#dbeafe' : '#f3f4f6';
      const borderColor = isReporter ? '#93c5fd' : '#d1d5db';
      const labelColor = isReporter ? '#2563eb' : '#dc2626';
      const label = isReporter ? '📢 Reportador' : '⚠️ Reportado';

      let messageContent = '';
      if (msg.message) {
        messageContent = `<p style="margin: 0; font-size: 13px; color: #111827; word-break: break-word;">${escapeHtml(msg.message)}</p>`;
      }
      if (msg.image_url) {
        messageContent += `<p style="margin: 4px 0 0 0; font-size: 12px;"><a href="${escapeHtml(msg.image_url)}" style="color: #2563eb; text-decoration: underline;">📷 Ver imagen adjunta</a></p>`;
      }

      chatBubblesHtml += `
        <div style="text-align: ${alignment}; margin: 8px 0;">
          <div style="display: inline-block; max-width: 80%; text-align: left; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 10px 14px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; color: ${labelColor}; font-weight: 600;">${label} — ${escapeHtml(senderName)}</p>
            ${messageContent}
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #9ca3af; text-align: right;">${timestamp}</p>
          </div>
        </div>
      `;
    }
  }

  return `
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #374151;">💬 Conversación completa entre los usuarios</h3>
      <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280;">${messages.length} mensaje(s) encontrado(s)</p>
      <div style="max-height: 600px; overflow-y: auto; background-color: #ffffff; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb;">
        ${chatBubblesHtml}
      </div>
    </div>
  `;
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
      console.error('[send-admin-report-email] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse payload
    const payload: ReportPayload = await req.json();
    const { report_id, reporter_id, target_type, target_id, reason, description, created_at } = payload;

    console.log('[send-admin-report-email] Received report alert:', {
      report_id,
      reporter_id,
      target_type,
      target_id,
      reason,
    });

    // Fetch active admin email addresses from database
    const { data: admins, error: adminsError } = await supabase
      .from('email_forwarding_addresses')
      .select('email')
      .eq('is_active', true);

    if (adminsError || !admins || admins.length === 0) {
      console.warn('[send-admin-report-email] No active admin emails configured', adminsError);
      return new Response(
        JSON.stringify({ error: 'No admin emails configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch reporter's nickname
    let reporterNickname = 'Desconocido';
    if (reporter_id) {
      const { data: reporterProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', reporter_id)
        .maybeSingle();
      if (reporterProfile?.nickname) {
        reporterNickname = reporterProfile.nickname;
      }
    }

    // Fetch prior report history for the target user
    let priorReportCount = 0;
    if (target_type === 'user') {
      const { data: priorReports, count } = await supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('target_type', 'user')
        .eq('target_id', target_id)
        .neq('id', report_id);
      priorReportCount = count || 0;
    }

    // Resolve extra details depending on target_type
    let targetDetailsHtml = '';
    let targetNickname = 'Usuario';
    
    if (target_type === 'message') {
      // Fetch message content and sender nickname
      const { data: messageRecord } = await supabase
        .from('trade_chats')
        .select('message, sender_id')
        .eq('id', parseInt(target_id, 10))
        .maybeSingle();

      if (messageRecord) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', messageRecord.sender_id)
          .maybeSingle();

        targetDetailsHtml = `
          <div style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 12px; margin-top: 8px; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>Remitente:</strong> ${escapeHtml(senderProfile?.nickname || 'Usuario')}</p>
            <p style="margin: 6px 0 0 0; font-style: italic; color: #111827;">"${escapeHtml(messageRecord.message)}"</p>
          </div>
        `;
      }
    } else if (target_type === 'listing') {
      // Fetch listing details
      const { data: listingRecord } = await supabase
        .from('trade_listings')
        .select('title, user_id')
        .eq('id', parseInt(target_id, 10))
        .maybeSingle();

      if (listingRecord) {
        targetDetailsHtml = `
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;"><strong>Anuncio reported:</strong> "${escapeHtml(listingRecord.title || '')}" (ID: ${target_id})</p>
        `;
      }
    } else if (target_type === 'user') {
      // Fetch user details
      const { data: profileRecord } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', target_id)
        .maybeSingle();

      if (profileRecord) {
        targetNickname = profileRecord.nickname || 'Usuario';
        targetDetailsHtml = `
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;"><strong>Usuario reportado:</strong> ${escapeHtml(profileRecord.nickname || '')} (ID: ${target_id})</p>
        `;
      }
    }

    // Fetch chat conversation between reporter and reported user
    let chatHtml = '';
    if (target_type === 'user' && reporter_id) {
      try {
        let userA = reporter_id;
        let userB = target_id;

        const SYSTEM_REPORTER_ID = 'b644414f-73d8-4dc3-a36c-964a933e4eb8';
        if (reporter_id === SYSTEM_REPORTER_ID && description) {
          // It's an automated report, find the other user from the flagged message
          const matches = Array.from(description.matchAll(/Mensaje ID:\s*(\d+)/g));
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const messageId = parseInt(lastMatch[1], 10);
            if (!isNaN(messageId)) {
              const { data: chatMsg } = await supabase
                .from('trade_chats')
                .select('sender_id, receiver_id, match_conversation_id')
                .eq('id', messageId)
                .maybeSingle();

              if (chatMsg) {
                if (chatMsg.match_conversation_id) {
                  const { data: matchConv } = await supabase
                    .from('match_conversations')
                    .select('user_a_id, user_b_id')
                    .eq('id', chatMsg.match_conversation_id)
                    .maybeSingle();
                  if (matchConv) {
                    userA = matchConv.user_a_id === target_id ? matchConv.user_b_id : matchConv.user_a_id;
                  }
                } else if (chatMsg.receiver_id) {
                  userA = chatMsg.sender_id === target_id ? chatMsg.receiver_id : chatMsg.sender_id;
                }
              }
            }
          }
        }

        // Only fetch if we have two valid users and they are not the same (or the system)
        if (userA && userB && userA !== SYSTEM_REPORTER_ID && userA !== userB) {
          // Fetch listing chat messages between the two users
          const { data: listingMessages } = await supabase
            .from('trade_chats')
            .select('id, sender_id, message, image_url, is_system, created_at')
            .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
            .order('created_at', { ascending: true });

          // Also check match conversations
          const { data: matchConvs } = await supabase
            .from('match_conversations')
            .select('id')
            .or(`and(user_a_id.eq.${userA},user_b_id.eq.${userB}),and(user_a_id.eq.${userB},user_b_id.eq.${userA})`);

          let allMessages: ChatMessage[] = (listingMessages || []) as ChatMessage[];

          if (matchConvs && matchConvs.length > 0) {
            const convIds = matchConvs.map(c => c.id);
            const { data: matchMessages } = await supabase
              .from('trade_chats')
              .select('id, sender_id, message, image_url, is_system, created_at')
              .in('match_conversation_id', convIds)
              .order('created_at', { ascending: true });

            if (matchMessages) {
              allMessages = [...allMessages, ...(matchMessages as ChatMessage[])];
            }
          }

          // Sort all messages chronologically
          allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          // Get nicknames for the two users
          let userANickname = 'Desconocido';
          let userBNickname = targetNickname;

          if (userA === reporter_id) {
            userANickname = reporterNickname;
          } else {
            const { data: profileA } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', userA)
              .maybeSingle();
            if (profileA?.nickname) {
              userANickname = profileA.nickname;
            }
          }

          chatHtml = renderChatHtml(allMessages, userANickname, userBNickname, userA);
        } else {
          chatHtml = `
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #374151;">💬 Conversación entre los usuarios</h3>
              <p style="margin: 0; font-size: 13px; color: #6b7280; font-style: italic;">No se encontraron mensajes entre estos usuarios.</p>
            </div>
          `;
        }
      } catch (chatErr) {
        console.error('[send-admin-report-email] Error fetching chat history:', chatErr);
        chatHtml = `
          <div style="background-color: #fef2f2; padding: 12px; border-radius: 8px; margin-top: 20px; border: 1px solid #fecaca;">
            <p style="margin: 0; font-size: 13px; color: #991b1b;">⚠️ No se pudo cargar el historial de chat.</p>
          </div>
        `;
      }
    }

    // Build prior reports warning banner
    let priorReportsBanner = '';
    if (target_type === 'user' && priorReportCount > 0) {
      priorReportsBanner = `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px; margin-bottom: 16px; text-align: center;">
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #92400e;">⚠️ Este usuario ha sido reportado ${priorReportCount} ${priorReportCount === 1 ? 'vez' : 'veces'} anteriormente</p>
        </div>
      `;
    }

    // Build reporter info section
    let reporterInfoHtml = '';
    if (reporter_id) {
      reporterInfoHtml = `
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #4b5563;"><strong>Reportado por:</strong> ${escapeHtml(reporterNickname)} <span style="color: #9ca3af; font-size: 11px;">(${reporter_id})</span></p>
      `;
    }

    const adminPanelUrl = `https://cambiocromos.com/admin/reports`;
    const subject = `[CambioCromos] Moderación Urgente - Nuevo Reporte #${report_id}`;

    // Premium HTML Email Template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">Moderación CambioCromos</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Notificación Urgente de Reporte</p>
          </div>
          <div style="background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
            
            ${priorReportsBanner}

            <h2 style="color: #111827; font-size: 18px; margin-top: 0; margin-bottom: 16px;">Detalles del Reporte #${report_id}</h2>
            
            ${reporterInfoHtml}

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; width: 120px;"><strong>Tipo de entidad:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827;">${getTargetTypeLabel(target_type)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;"><strong>Motivo:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; font-weight: 600; color: #b91c1c;">${getReasonLabel(reason)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;"><strong>Descripción:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827;">${escapeHtml(description || 'Sin descripción adicional.')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;"><strong>Fecha:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827;">${new Date(created_at).toLocaleString('es-ES')}</td>
              </tr>
            </table>

            ${targetDetailsHtml}

            ${chatHtml}

            <div style="text-align: center; margin-top: 30px;">
              <a href="${adminPanelUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Ir al Panel de Moderación</a>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">Este es un correo automático enviado a los administradores de CambioCromos.</p>
          </div>
        </body>
      </html>
    `;

    // Loop through admin emails and send with rate limiting delay
    let sentCount = 0;
    for (const admin of admins) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: admin.email,
            subject: subject,
            html: htmlContent,
            text: stripHtml(htmlContent),
            reply_to: 'info@cambiocromos.com',
          }),
        });

        if (resendResponse.ok) {
          sentCount++;
          console.log(`[send-admin-report-email] Alert sent to admin: ${admin.email}`);
        } else {
          const resendErr = await resendResponse.json();
          console.error(`[send-admin-report-email] Resend delivery failed for ${admin.email}:`, resendErr);
        }

        // Delay to respect rate limits
        if (admins.indexOf(admin) < admins.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      } catch (err) {
        console.error(`[send-admin-report-email] Failed to send email to ${admin.email}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, recipients_alerted: sentCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-admin-report-email] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
