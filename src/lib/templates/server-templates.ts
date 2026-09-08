import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { isTransientNetworkError } from '@/lib/supabase/notifications';

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
    slug?: string;
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
            if (isTransientNetworkError(error)) {
                logger.warnLocal('Transient network error fetching public templates on server:', error);
                return [];
            }
            logger.error('Error fetching public templates on server:', error);
            throw new Error(error.message);
        }

        return (data || []) as Template[];
    } catch (error) {
        if (isTransientNetworkError(error)) {
            logger.warnLocal('Transient network error fetching public templates on server:', error);
        } else {
            logger.error('Exception fetching public templates on server:', error);
        }
        return [];
    }
}

// --- Types for template detail pages ---

export interface TemplateSlot {
    id: string;
    slot_number: number;
    slot_variant: string | null;
    global_number: number | null;
    label: string | null;
    is_special: boolean;
    data: Record<string, string | number | boolean>;
}

export interface TemplatePage {
    id: string;
    page_number: number;
    title: string;
    type: 'team' | 'special';
    slots_count: number;
    slots: TemplateSlot[];
}

export interface TemplateDetailsData {
    id: string;
    author_id: string;
    author_nickname: string;
    title: string;
    description: string | null;
    image_url: string | null;
    is_public: boolean;
    rating_avg: number;
    rating_count: number;
    copies_count: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    slug?: string;
}

export interface TemplateDetailsResponse {
    template: TemplateDetailsData;
    pages: TemplatePage[];
}

/**
 * Fetches a public template's full details (metadata + pages + slots) by slug.
 * Returns null if not found, not public, or deleted.
 */
export async function getPublicTemplateBySlug(slug: string): Promise<{ data: TemplateDetailsResponse; templateId: number } | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { /* SC context */ }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { /* SC context */ }
                },
            },
        }
    );

    try {
        // Resolve slug to template ID
        const { data: slugResult, error: slugError } = await supabase.rpc('resolve_template_slug', { p_slug: slug });
        if (slugError || !slugResult || slugResult.length === 0) return null;

        const templateId = slugResult[0].template_id;

        // Fetch full template details
        const { data: result, error: detailError } = await supabase.rpc('get_template_details', { p_template_id: templateId });
        if (detailError || !result) return null;

        const response = result as unknown as TemplateDetailsResponse;

        // Critical guard: ensure template is public
        if (!response.template.is_public) return null;
        if (response.template.deleted_at) return null;

        return { data: response, templateId };
    } catch (error) {
        logger.error('Error fetching public template by slug:', error);
        return null;
    }
}

/**
 * Lightweight lookup: resolves a numeric template ID to its slug.
 * Used for redirecting /albumes/47 → /albumes/panini-world-cup-2026.
 */
export async function getSlugByNumericId(id: number): Promise<string | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { /* SC context */ }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { /* SC context */ }
                },
            },
        }
    );

    try {
        const { data, error } = await supabase.rpc('resolve_template_id', { p_id: id });
        if (error || !data || data.length === 0) return null;
        return data[0].template_slug;
    } catch (error) {
        logger.error('Error resolving template ID to slug:', error);
        return null;
    }
}

/**
 * Resolves a slug to a numeric template ID.
 * Used by proxy middleware for auth redirects.
 */
export async function getTemplateIdBySlug(slug: string): Promise<number | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { /* SC context */ }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { /* SC context */ }
                },
            },
        }
    );

    try {
        const { data, error } = await supabase.rpc('resolve_template_slug', { p_slug: slug });
        if (error || !data || data.length === 0) return null;
        return data[0].template_id;
    } catch (error) {
        logger.error('Error resolving slug to template ID:', error);
        return null;
    }
}
