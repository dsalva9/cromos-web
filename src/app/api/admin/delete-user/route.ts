import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, reason } = await request.json();

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
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    // First, call RPC to purge user data (if it exists)
    // Note: Using adminClient because admin_purge_user requires proper permissions
    const { error: purgeError } = await adminClient.rpc('admin_purge_user', {
      p_user_id: userId,
      p_admin_id: user.id
    });

    if (purgeError) {
      console.error('Error purging user data:', purgeError);
      return NextResponse.json(
        { error: `Error purging user data: ${purgeError.message}` },
        { status: 500 }
      );
    }

    // Delete user from auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar usuario' },
        { status: 500 }
      );
    }

    // Log action to audit using adminClient
    const { error: auditError } = await adminClient.from('audit_log').insert({
      user_id: userId,
      admin_id: user.id,
      entity: 'user',
      entity_type: 'user',
      action: 'delete',
      moderation_action_type: 'delete_user',
      moderated_entity_type: 'user',
      moderation_reason: reason || 'No reason provided',
      new_values: { deleted_by: user.id, deleted_at: new Date().toISOString() },
      occurred_at: new Date().toISOString()
    });

    if (auditError) {
      console.error('Error logging to audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado con éxito'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
