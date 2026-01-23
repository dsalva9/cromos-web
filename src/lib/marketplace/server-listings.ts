import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { Listing } from '@/types/v1.6.0';

interface GetMarketplaceDataParams {
    search?: string;
    limit?: number;
    offset?: number;
    sortByDistance?: boolean;
    collectionIds?: number[];
}

export async function getMarketplaceData(params: GetMarketplaceDataParams = {}) {
    const {
        search = '',
        limit = 20,
        offset = 0,
        sortByDistance = false,
        collectionIds = []
    } = params;

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

    let userPostcode: string | null = null;
    let userId: string | null = null;

    try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            userId = session.user.id;

            // Fetch user postcode for distance sorting
            const { data: profile } = await supabase
                .from('profiles')
                .select('postcode')
                .eq('id', userId)
                .single();

            if (profile?.postcode) {
                userPostcode = profile.postcode;
            }
        }

        // Fetch listings
        const rpcParams = {
            p_limit: limit,
            p_offset: offset,
            p_search: search || null,
            p_viewer_postcode: userPostcode, // Use server-fetched postcode
            p_sort_by_distance: sortByDistance && !!userPostcode,
            p_collection_ids: collectionIds.length > 0 ? collectionIds : null,
        };

        const { data, error } = await supabase.rpc(
            'list_trade_listings_with_collection_filter',
            rpcParams
        );

        if (error) {
            logger.error('Error fetching listings on server:', error);
            return { listings: [], userPostcode };
        }

        // Map RPC response to Listing type
        // Note: server-side mapping matches useListings.ts logic
        const listings = (data || []).map((item: any) => ({
            id: item.id.toString(),
            user_id: item.user_id,
            author_nickname: item.author_nickname,
            author_avatar_url: item.author_avatar_url,
            author_postcode: item.author_postcode,
            author_is_suspended: item.author_is_suspended,
            author_deleted_at: item.author_deleted_at,
            deleted_at: item.deleted_at,
            title: item.title,
            description: item.description,
            sticker_number: item.sticker_number,
            collection_name: item.collection_name,
            image_url: item.image_url,
            status: item.status,
            views_count: item.views_count,
            created_at: item.created_at,
            copy_id: item.copy_id?.toString(),
            slot_id: item.slot_id?.toString(),
            distance_km: item.distance_km,
            is_group: item.is_group,
            group_count: item.group_count,
        }));

        return { listings: listings as Listing[], userPostcode };
    } catch (error) {
        logger.error('Exception fetching marketplace data on server:', error);
        return { listings: [], userPostcode: null };
    }
}
