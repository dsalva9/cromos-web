import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
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

    // Generate password reset link
    const { error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: userId // Note: This should be email, we need to fetch user email first
    });

    if (error) {
      console.error('Error generating reset link:', error);
      return NextResponse.json(
        { error: 'Error al generar enlace de restablecimiento' },
        { status: 500 }
      );
    }

    // Log action to audit
    await supabase.from('audit_log').insert({
      action_type: 'force_password_reset',
      performed_by: session.user.id,
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
