import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify requesting user is admin
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Cookie setting may fail in server components
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch {
              // Cookie removal may fail in server components
            }
          }
        }
      }
    );
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch user's email first
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Generate password reset link
    const { data: linkData, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email
    });

    if (error || !linkData) {
      console.error('Error generating reset link:', error);
      return NextResponse.json(
        { error: 'Error al generar enlace de restablecimiento' },
        { status: 500 }
      );
    }

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Configuración de email incompleta' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: 'CambioCromos <info@cambiocromos.com>',
        to: userData.user.email,
        subject: 'Restablecer tu contraseña',
        html: `
          <h2>Restablecimiento de contraseña</h2>
          <p>Un administrador ha solicitado restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <p><a href="${linkData.properties.action_link}">Restablecer contraseña</a></p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Error al enviar el correo' },
        { status: 500 }
      );
    }

    // Log action to audit
    await adminClient.from('audit_log').insert({
      action_type: 'force_password_reset',
      performed_by: user.id,
      target_type: 'user',
      target_id: userId,
      metadata: { reset_link_generated: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Correo de restablecimiento enviado'
    });
  } catch (error) {
    console.error('Force reset error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
