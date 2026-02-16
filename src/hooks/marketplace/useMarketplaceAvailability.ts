import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';
import { isTransientNetworkError } from '@/lib/supabase/notifications';

// ─── Types ───────────────────────────────────────────────────────────────

/** One entry per user album, returned by counts mode */
export interface MarketplaceAvailabilityCount {
    copy_id: number;
    missing_in_marketplace: number;
}

/** One entry per missing slot with marketplace listings, returned by slots mode */
export interface MarketplaceAvailabilitySlot {
    slot_id: number;
    slot_number: number;
    slot_variant: string | null;
    label: string | null;
    page_title: string;
    listing_count: number;
}

// ─── Hooks ───────────────────────────────────────────────────────────────

/**
 * Returns marketplace availability counts for ALL of the current user's albums.
 *
 * Each entry tells you how many of the user's missing stickers have active listings
 * in the marketplace. Used by dashboard and album card CTAs.
 *
 * Data is cached for 5 minutes since real-time updates aren't critical.
 */
export function useMarketplaceAvailabilityCounts() {
    const supabase = useSupabaseClient();
    const user = useUser();

    const { data, isLoading, error } = useQuery({
        queryKey: QUERY_KEYS.marketplaceAvailability(),
        queryFn: async (): Promise<MarketplaceAvailabilityCount[]> => {
            const { data: result, error: rpcError } = await supabase.rpc(
                'get_marketplace_availability',
            );

            if (rpcError) {
                if (isTransientNetworkError(rpcError)) {
                    logger.info('[useMarketplaceAvailabilityCounts] RPC aborted (navigation):', rpcError);
                } else {
                    logger.error('[useMarketplaceAvailabilityCounts] RPC error:', rpcError);
                }
                throw rpcError;
            }

            // RPC returns JSONB — parse if needed
            const parsed: MarketplaceAvailabilityCount[] =
                typeof result === 'string' ? JSON.parse(result) : (result ?? []);

            return parsed;
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        counts: data ?? [],
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
    };
}

/**
 * Returns slot-level marketplace availability for a SPECIFIC album copy.
 *
 * Each entry identifies a missing sticker slot that has active listings from
 * other users. Used by the album detail page to render 🛒 badges on sticker cells.
 *
 * @param copyId - The user_template_copies.id to check
 */
export function useMarketplaceAvailabilitySlots(copyId: number | undefined) {
    const supabase = useSupabaseClient();
    const user = useUser();

    const { data, isLoading, error } = useQuery({
        queryKey: QUERY_KEYS.marketplaceAvailabilitySlots(copyId ?? 0),
        queryFn: async (): Promise<MarketplaceAvailabilitySlot[]> => {
            if (!copyId) return [];

            const { data: result, error: rpcError } = await supabase.rpc(
                'get_marketplace_availability',
                { p_copy_id: copyId },
            );

            if (rpcError) {
                if (isTransientNetworkError(rpcError)) {
                    logger.info('[useMarketplaceAvailabilitySlots] RPC aborted (navigation):', rpcError);
                } else {
                    logger.error('[useMarketplaceAvailabilitySlots] RPC error:', rpcError);
                }
                throw rpcError;
            }

            const parsed: MarketplaceAvailabilitySlot[] =
                typeof result === 'string' ? JSON.parse(result) : (result ?? []);

            return parsed;
        },
        enabled: !!user && !!copyId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        slots: data ?? [],
        slotIds: new Set((data ?? []).map((s) => s.slot_id)),
        totalAvailable: data?.length ?? 0,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
    };
}
