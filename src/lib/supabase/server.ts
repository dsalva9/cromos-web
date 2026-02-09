import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 *
 * Uses the `cookies()` API from Next.js to read/write auth cookies.
 * The `set` and `remove` calls are wrapped in try-catch because they
 * will throw when called from a Server Component (read-only context).
 * This is safe as long as the middleware refreshes sessions on every request.
 */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Called from a Server Component — safe to ignore
                        // when middleware handles session refresh.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // Called from a Server Component — safe to ignore.
                    }
                },
            },
        }
    );
}

/**
 * Creates a Supabase admin client with the service-role key.
 *
 * This client bypasses RLS and should only be used for privileged
 * server-side operations (e.g., admin API routes).
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function createSupabaseAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

