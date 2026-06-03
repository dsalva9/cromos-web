import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check endpoint for uptime monitoring (BetterStack, UptimeRobot, etc.)
 *
 * This endpoint verifies that both the application server AND the database
 * are responding. It uses the service role key to bypass auth, so it tests
 * the actual DB connection without needing a user session.
 *
 * Returns:
 * - 200 + { status: "ok", db_latency_ms } when everything is healthy
 * - 503 + { status: "degraded", error } when the DB is unreachable/slow
 *
 * Configure your uptime monitor to:
 * 1. GET https://your-domain.com/api/health
 * 2. Expect HTTP 200
 * 3. Expect response body to contain "ok"
 */
export async function GET() {
  const start = Date.now();

  try {
    // Use anon key (no service role needed for a simple ping)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Lightweight query that touches the DB — just check if we can reach it.
    // SELECT 1 via RPC would be ideal, but a simple table count works too.
    const { error } = await supabase
      .from('collection_templates')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return NextResponse.json(
        { status: 'degraded', error: error.message, db_latency_ms: latency },
        { status: 503 }
      );
    }

    // If the query takes more than 5 seconds, something is very wrong
    if (latency > 5000) {
      return NextResponse.json(
        { status: 'degraded', error: 'DB response too slow', db_latency_ms: latency },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: 'ok', db_latency_ms: latency },
      { status: 200 }
    );
  } catch (err) {
    const latency = Date.now() - start;
    return NextResponse.json(
      {
        status: 'degraded',
        error: err instanceof Error ? err.message : 'Unknown error',
        db_latency_ms: latency,
      },
      { status: 503 }
    );
  }
}
