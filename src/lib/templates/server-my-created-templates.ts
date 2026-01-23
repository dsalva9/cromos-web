import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export interface CreatedTemplate {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    is_public: boolean;
    rating_avg: number;
    rating_count: number;
    copies_count: number;
    pages_count: number;
    total_slots: number;
    created_at: string;
    author_id: string;
    author_nickname: string;
    deleted_at: string | null;
    scheduled_for: string | null;
}

/**
 * Server-side function to fetch templates created by the authenticated user.
 * Returns null if user is not authenticated (caller should redirect).
 * Returns empty array on error.
 */
export async function getMyCreatedTemplates(): Promise<CreatedTemplate[] | null> {
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
                        // Ignored in Server Component
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // Ignored in Server Component
                    }
                },
            },
        }
    );

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return null; // Caller should redirect to login
        }

        const userId = session.user.id;

        // Parallel fetch: templates, user profile, and we'll get retention schedule after
        const [templatesResult, profileResult] = await Promise.all([
            supabase
                .from('collection_templates')
                .select('id, title, description, image_url, is_public, created_at, author_id, rating_avg, rating_count, copies_count, deleted_at')
                .eq('author_id', userId)
                .order('created_at', { ascending: false }),
            supabase
                .from('profiles')
                .select('nickname')
                .eq('id', userId)
                .single()
        ]);

        if (templatesResult.error) {
            logger.error('Error fetching templates on server:', templatesResult.error);
            return [];
        }

        const userNickname = profileResult.data?.nickname || 'Usuario';
        const templatesData = templatesResult.data || [];

        // Get retention schedule for deleted templates (if any)
        const deletedTemplateIds = templatesData
            .filter(t => t.deleted_at)
            .map(t => t.id.toString());

        let scheduleMap: Record<string, string> = {};
        if (deletedTemplateIds.length > 0) {
            const { data: scheduleData } = await supabase
                .from('retention_schedule')
                .select('entity_id, scheduled_for')
                .eq('entity_type', 'template')
                .in('entity_id', deletedTemplateIds)
                .is('processed_at', null);

            scheduleMap = (scheduleData || []).reduce((acc, item) => {
                acc[item.entity_id] = item.scheduled_for;
                return acc;
            }, {} as Record<string, string>);
        }

        // Transform the data
        const transformedData: CreatedTemplate[] = templatesData.map((template) => {
            const templateId = template.id.toString();
            return {
                id: templateId,
                title: template.title,
                description: template.description,
                image_url: template.image_url,
                is_public: template.is_public,
                rating_avg: template.rating_avg || 0,
                rating_count: template.rating_count || 0,
                copies_count: template.copies_count || 0,
                pages_count: 0, // Not needed for display
                total_slots: 0, // Not needed for display
                created_at: template.created_at,
                author_id: template.author_id,
                author_nickname: userNickname,
                deleted_at: template.deleted_at,
                scheduled_for: scheduleMap[templateId] || null,
            };
        });

        return transformedData;
    } catch (error) {
        logger.error('Exception fetching created templates:', error);
        return [];
    }
}
