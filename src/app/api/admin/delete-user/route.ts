import { createServerSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: max 3 admin delete-user requests per minute per IP
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 3, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { userId, reason } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify requesting user is admin
    const supabase = await createServerSupabaseClient();
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
    let adminClient;
    try {
      adminClient = createSupabaseAdminClient();
    } catch {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

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
