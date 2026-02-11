import { createServerSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  // Rate limit: max 3 admin force-resets per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 3, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify requesting user is admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Use service role client for admin operations
    let adminClient;
    try {
      adminClient = createSupabaseAdminClient();
    } catch {
      logger.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'ConfiguraciÃ³n del servidor incompleta' },
        { status: 500 }
      );
    }

    // Fetch user's email first
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      logger.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Generate password reset link
    // redirectTo must point to /auth/callback so the PKCE code gets exchanged
    // for a session before redirecting to the reset-password page.
    // Without this, middleware sees an unauthenticated user hitting /profile/*
    // and redirects to /login.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cambiocromos.com';
    const { data: linkData, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/profile/reset-password`
      }
    });

    if (error || !linkData) {
      logger.error('Error generating reset link:', error);
      return NextResponse.json(
        { error: 'Error al generar enlace de restablecimiento' },
        { status: 500 }
      );
    }

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'ConfiguraciÃ³n de email incompleta' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: 'CambioCromos <info@cambiocromos.com>',
        to: userData.user.email,
        subject: 'Restablecer tu contraseÃ±a',
        html: `
          <h2>Restablecimiento de contraseÃ±a</h2>
          <p>Un administrador ha solicitado restablecer tu contraseÃ±a.</p>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseÃ±a:</p>
          <p><a href="${linkData.properties.action_link}">Restablecer contraseÃ±a</a></p>
          <p>Este enlace expirarÃ¡ en 24 horas.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        `
      });
    } catch (emailError) {
      logger.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Error al enviar el correo' },
        { status: 500 }
      );
    }

    // Log action to audit
    const { error: auditError } = await adminClient.from('audit_log').insert({
      user_id: userId,
      admin_id: user.id,
      entity: 'user',
      entity_type: 'user',
      action: 'update',
      moderation_action_type: 'force_password_reset',
      moderated_entity_type: 'user',
      moderation_reason: 'Admin-initiated password reset',
      new_values: { reset_link_generated: true },
      occurred_at: new Date().toISOString()
    });

    if (auditError) {
      logger.error('Error logging to audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Correo de restablecimiento enviado'
    });
  } catch (error) {
    logger.error('Force reset error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
