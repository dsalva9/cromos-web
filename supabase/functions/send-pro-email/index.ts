// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "CambioCromos <info@cambiocromos.com>";
const APP_URL = "https://cambiocromos.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Email Templates (Spanish)
// ============================================================

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function baseTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string): string {
  const cta = ctaText && ctaUrl
    ? `<div style="text-align:center;margin:30px 0;">
        <a href="${ctaUrl}" style="background:#FFC000;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${escapeHtml(ctaText)}</a>
       </div>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:20px 0;">
      <h1 style="color:#FFC000;font-size:28px;margin:0;">CambioCromos</h1>
    </div>
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color:#111827;margin-top:0;">${title}</h2>
      ${body}
      ${cta}
    </div>
    <div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px;">
      <p>© ${new Date().getFullYear()} CambioCromos. Todos los derechos reservados.</p>
    </div>
  </div>
</body></html>`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

type EmailType =
  | "welcome_trial"
  | "welcome_subscription"
  | "trial_expiring_7d"
  | "trial_expiring_1d"
  | "trial_expired"
  | "subscription_cancelled";

interface EmailData {
  nickname: string;
  expiresAt?: string;
  trialDays?: number;
  plan?: string;
}

function buildEmail(type: EmailType, data: EmailData): { subject: string; html: string } {
  const name = escapeHtml(data.nickname || "Coleccionista");
  const expiresFormatted = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : "";

  switch (type) {
    case "welcome_trial": {
      const subject = "🎉 ¡Bienvenido a CambioCromos PRO!";
      const body = `
        <p style="color:#374151;">¡Hola ${name}!</p>
        <p style="color:#374151;">Tu periodo de prueba PRO de <strong>${data.trialDays || 30} días</strong> ya está activo. Esto es lo que incluye:</p>
        <ul style="color:#374151;line-height:1.8;">
          <li>📦 <strong>Subidas ilimitadas</strong> al marketplace</li>
          <li>⭐ <strong>800 créditos de destacados</strong> al mes</li>
          <li>🚫 <strong>Sin anuncios</strong> en toda la app</li>
          <li>🏷️ <strong>Badge PRO</strong> en tu perfil</li>
        </ul>
        <p style="color:#374151;">Tu prueba expira el <strong>${expiresFormatted}</strong>.</p>
        <p style="color:#6B7280;font-size:14px;">Después podrás suscribirte por solo 4,99€/mes.</p>`;
      const html = baseTemplate(subject, body, "Ir a CambioCromos", APP_URL);
      return { subject, html };
    }

    case "welcome_subscription": {
      const planName = data.plan === "yearly" ? "Anual (49,99€/año)" : "Mensual (4,99€/mes)";
      const subject = "✅ ¡Tu suscripción PRO está activa!";
      const body = `
        <p style="color:#374151;">¡Hola ${name}!</p>
        <p style="color:#374151;">Tu suscripción <strong>CambioCromos PRO ${planName}</strong> ya está activa.</p>
        <p style="color:#374151;">Disfruta de todas las ventajas PRO:</p>
        <ul style="color:#374151;line-height:1.8;">
          <li>📦 Subidas ilimitadas al marketplace</li>
          <li>⭐ 800 créditos de destacados al mes</li>
          <li>🚫 Sin anuncios</li>
          <li>🏷️ Badge PRO exclusivo</li>
        </ul>
        <p style="color:#374151;">Próxima renovación: <strong>${expiresFormatted}</strong></p>`;
      const html = baseTemplate(subject, body, "Ir a CambioCromos", APP_URL);
      return { subject, html };
    }

    case "trial_expiring_7d": {
      const subject = "⏰ Tu prueba PRO expira en 7 días";
      const body = `
        <p style="color:#374151;">¡Hola ${name}!</p>
        <p style="color:#374151;">Tu periodo de prueba PRO expira el <strong>${expiresFormatted}</strong>.</p>
        <p style="color:#374151;">Cuando termine, volverás al plan gratuito con límite de 2 subidas/día y anuncios.</p>
        <p style="color:#374151;"><strong>Suscríbete ahora</strong> para seguir disfrutando de subidas ilimitadas, sin anuncios y 800 créditos mensuales.</p>
        <div style="background:#FFFBEB;border:1px solid #FFC000;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#92400E;font-weight:bold;">💰 Desde solo 4,99€/mes</p>
        </div>`;
      const html = baseTemplate(subject, body, "Suscribirme ahora", `${APP_URL}/pro`);
      return { subject, html };
    }

    case "trial_expiring_1d": {
      const subject = "⚠️ Tu prueba PRO expira mañana";
      const body = `
        <p style="color:#374151;">¡Hola ${name}!</p>
        <p style="color:#374151;">Tu prueba PRO expira <strong>mañana ${expiresFormatted}</strong>.</p>
        <p style="color:#374151;">Es tu última oportunidad para suscribirte y no perder tus ventajas PRO.</p>
        <div style="background:#FEF2F2;border:1px solid #EF4444;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#991B1B;font-weight:bold;">⚠️ Mañana perderás: subidas ilimitadas, sin anuncios, créditos de destacados</p>
        </div>`;
      const html = baseTemplate(subject, body, "Suscribirme ahora", `${APP_URL}/pro`);
      return { subject, html };
    }

    case "trial_expired": {
      const subject = "Tu prueba PRO ha terminado";
      const body = `
        <p style="color:#374151;">Hola ${name},</p>
        <p style="color:#374151;">Tu periodo de prueba PRO ha terminado. Has vuelto al plan gratuito:</p>
        <ul style="color:#374151;line-height:1.8;">
          <li>📦 Máximo 2 subidas/día</li>
          <li>📺 Anuncios activos</li>
          <li>⭐ Sin créditos de destacados mensuales</li>
        </ul>
        <p style="color:#374151;">¿Quieres volver a disfrutar de PRO? Suscríbete desde <strong>4,99€/mes</strong>.</p>`;
      const html = baseTemplate(subject, body, "Suscribirme a PRO", `${APP_URL}/pro`);
      return { subject, html };
    }

    case "subscription_cancelled": {
      const subject = "Tu suscripción PRO ha terminado";
      const body = `
        <p style="color:#374151;">Hola ${name},</p>
        <p style="color:#374151;">Tu suscripción PRO ha finalizado. Lamentamos verte partir.</p>
        <p style="color:#374151;">Has vuelto al plan gratuito. Si cambias de opinión, puedes volver a suscribirte en cualquier momento.</p>`;
      const html = baseTemplate(subject, body, "Volver a PRO", `${APP_URL}/pro`);
      return { subject, html };
    }
  }
}

// ============================================================
// Handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, user_id, email, nickname, expires_at, trial_days, plan } = await req.json();

    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: "type and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = buildEmail(type as EmailType, {
      nickname: nickname || "Coleccionista",
      expiresAt: expires_at,
      trialDays: trial_days,
      plan,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
        text: stripHtml(html),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-pro-email] Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the send
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("email_send_log").insert({
      user_id,
      email_type: `pro_${type}`,
      recipient_email: email,
      subject,
      status: "sent",
      resend_id: resendData.id,
    });

    console.log(`[send-pro-email] Sent '${type}' to ${email}`);

    return new Response(
      JSON.stringify({ ok: true, resend_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-pro-email] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
