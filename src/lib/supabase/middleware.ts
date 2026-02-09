import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Refreshes the Supabase auth session and syncs cookies between
 * the request and response. Should be called from the Next.js proxy/middleware
 * on every matched request.
 *
 * Based on the official Supabase SSR middleware pattern:
 * https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Set cookie on the request so downstream server code sees the update
                    request.cookies.set({ name, value, ...options });
                    // Re-create the response so the updated request cookies are forwarded
                    response = NextResponse.next({ request });
                    // Also set the cookie on the response so the browser receives it
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({ request });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // IMPORTANT: Do not run any code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard
    // to debug issues with users being randomly logged out.

    // getUser() validates the JWT against the Supabase Auth server,
    // refreshing the token if needed. This keeps sessions fresh.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return { user, response };
}
