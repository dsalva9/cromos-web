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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (listError) {
        logger.error('Error fetching users:', listError);
        return NextResponse.json(
          { error: 'Error fetching users' },
          { status: 500 }
        );
      }

      const users = data.users;
      if (!users || users.length === 0) {
        hasMore = false;
        break;
      }

      allUsers = allUsers.concat(users);

      // If we got fewer than perPage, we're done
      if (users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Filter users by confirmed email and date range
    const filteredUsers = allUsers.filter(u => {
      if (!u.email_confirmed_at || !u.email) return false;

      const createdTime = new Date(u.created_at).getTime();

      if (startBoundary !== null && createdTime < startBoundary) return false;
      if (endBoundary !== null && createdTime > endBoundary) return false;

      return true;
    });

    const emails = filteredUsers.map(u => u.email as string);

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
