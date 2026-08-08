import { createServerSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  // Rate limit: max 5 requests per minute
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const includeStart = searchParams.get('includeStart') === 'true';
    const includeEnd = searchParams.get('includeEnd') === 'true';

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
      logger.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    // Parse start boundary
    let startBoundary: number | null = null;
    if (startDateStr) {
      const startD = new Date(startDateStr);
      if (includeStart) {
        // Include from start of that day (midnight UTC)
        startD.setUTCHours(0, 0, 0, 0);
      } else {
        // Exclude that day: start from next day midnight
        startD.setUTCHours(0, 0, 0, 0);
        startD.setUTCDate(startD.getUTCDate() + 1);
      }
      startBoundary = startD.getTime();
    }

    // Parse end boundary
    let endBoundary: number | null = null;
    if (endDateStr) {
      const endD = new Date(endDateStr);
      if (includeEnd) {
        // Include entire end day
        endD.setUTCHours(23, 59, 59, 999);
      } else {
        // Exclude that day: end at start of that day
        endD.setUTCHours(0, 0, 0, 0);
      }
      endBoundary = endD.getTime();
    }

    // Use database function to query auth.users directly via SQL
    // This avoids GoTrue's listUsers bug with NULL confirmation_token
    const startTimestamp = startBoundary ? new Date(startBoundary).toISOString() : null;
    const endTimestamp = endBoundary ? new Date(endBoundary).toISOString() : null;

    const { data: rows, error: rpcError } = await adminClient
      .rpc('get_subscriber_emails', {
        p_start_date: startTimestamp,
        p_end_date: endTimestamp,
      })
      .limit(100000); // Override PostgREST default 1000 row limit

    if (rpcError) {
      logger.error('Error fetching subscriber emails:', rpcError);
      return NextResponse.json(
        { error: 'Error fetching users' },
        { status: 500 }
      );
    }

    const emails = (rows || []).map((r: { email: string }) => r.email);

    return NextResponse.json({
      emails,
      count: emails.length
    });

  } catch (error) {
    logger.error('Newsletter subscribers error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
