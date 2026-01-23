import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';

export interface TemplateCopy {
    copy_id: string;
    template_id: string;
    title: string;
    image_url?: string;
    is_active: boolean;
    copied_at: string;
    original_author_nickname: string;
    original_author_id: string;
    completed_slots: number;
    total_slots: number;
    completion_percentage: number;
}

export async function getMyTemplateCopies() {
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
                        // Ignored in SC
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // Ignored in SC
                    }
                },
            },
        }
    );

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // Return null to indicate need for redirect
            return null;
        }

        // Call RPC
        const { data, error } = await supabase.rpc('get_my_template_copies');

        if (error) {
            logger.error('Error fetching my template copies on server:', error);
            throw error;
        }

        // Process data to calculate percentage (same logic as client)
        const processedCopies = (data || []).map((copy: any) => {
            const completed = copy.completed_slots || 0;
            const total = copy.total_slots || 0;
            const completionPercentage =
                total > 0 ? Math.round((completed / total) * 100) : 0;

            return {
                ...copy,
                completed_slots: completed,
                total_slots: total,
                completion_percentage: completionPercentage,
            };
        });

        return processedCopies as TemplateCopy[];
    } catch (error) {
        logger.error('Exception fetching my template copies:', error);
        return [];
    }
}
