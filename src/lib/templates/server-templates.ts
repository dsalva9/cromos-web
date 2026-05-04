import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export interface Template {
    id: number;
    author_id: string;
    author_nickname: string;
    title: string;
    description: string | null;
    image_url: string | null;
    rating_avg: number;
    rating_count: number;
    copies_count: number;
    pages_count: number;
    total_slots?: number;
    created_at: string;
    deleted_at?: string | null;
    is_featured?: boolean;
}

interface GetTemplatesParams {
    search?: string;
    sortBy?: 'recent' | 'rating' | 'popular';
    limit?: number;
    offset?: number;
}

export async function getPublicTemplates(params: GetTemplatesParams = {}) {
    const {
        search = '',
        sortBy = 'recent',
        limit = 12,
        offset = 0
    } = params;

    // Create a Supabase client for the server environment
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
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // The `remove` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    try {
        // Check if user is logged in and get their country for sort priority
        let userCountryCode: string | null = null;
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('country_code')
                .eq('id', session.user.id)
                .single();

            if (profile?.country_code) {
                // Check feature flag before applying country sort
                const { data: flagResult } = await supabase.rpc('check_feature_flag', {
                    p_flag_id: 'multi_country',
                });
                if (flagResult === true) {
                    userCountryCode = profile.country_code;
                }
            }
        }

        const { data, error } = await supabase.rpc(
            'list_public_templates',
            {
                p_limit: limit,
                p_offset: offset,
                p_search: search || null,
                p_sort_by: sortBy,
                ...(userCountryCode ? { p_country_code: userCountryCode } : {}),
            }
        );

        if (error) {
            logger.error('Error fetching public templates on server:', error);
            throw new Error(error.message);
        }

        return (data || []) as Template[];
    } catch (error) {
        logger.error('Exception fetching public templates on server:', error);
        return [];
    }
}
