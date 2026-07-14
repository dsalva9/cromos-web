'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

/** Credits awarded per completed rewarded ad. Must match DB grant logic. */
export const CREDITS_PER_AD = 20;

/** Credit costs per highlight duration. Must match activate_highlight RPC. */
export const HIGHLIGHT_COSTS: Record<'48_hours' | '7_days', number> = {
    '48_hours': 100,
    '7_days': 300,
};

/**
 * Manages the current user's highlight credit balance.
 *
 * - Fetches balance on mount via get_my_highlight_credits RPC
 * - Provides earnCredits() for rewarded-ad credit grants (Android only)
 * - Provides activateHighlight() to spend credits and create a highlight
 */
export function useHighlightCredits() {
    const supabase = useSupabaseClient();
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const fetchBalance = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any).rpc('get_my_highlight_credits');
            if (error) throw error;
            setBalance(data?.balance ?? 0);
        } catch (err) {
            console.warn('[HighlightCredits] Failed to fetch balance:', err);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    /**
     * Called after a user successfully completes a rewarded ad.
     * Invokes the secure earn_rewarded_ad_credits() RPC (uses auth.uid() internally).
     * Returns the new balance.
     */
    const earnCredits = useCallback(async (): Promise<number> => {
        const { data, error } = await (supabase as any).rpc('earn_rewarded_ad_credits');
        if (error) throw error;
        const newBalance = (data as { balance: number } | null)?.balance ?? 0;
        setBalance(newBalance);
        return newBalance;
    }, [supabase]);

    /**
     * Activates a highlight for the given listing by spending credits.
     * Calls the activate_highlight(p_listing_id, p_duration) RPC which:
     *   - Verifies ownership
     *   - Checks no existing active highlight
     *   - Verifies sufficient credits
     *   - Debits credits and inserts listing_highlights row
     */
    const activateHighlight = useCallback(async (
        listingId: number,
        duration: '48_hours' | '7_days',
    ) => {
        const { data, error } = await (supabase as any).rpc('activate_highlight', {
            p_listing_id: listingId,
            p_duration: duration,
        });
        if (error) throw error;
        // Update local balance from RPC response
        const result = data as { credits_remaining?: number } | null;
        if (result?.credits_remaining !== undefined) {
            setBalance(result.credits_remaining);
        } else {
            await fetchBalance();
        }
        return data;
    }, [supabase, fetchBalance]);

    return {
        balance,
        loading,
        refresh: fetchBalance,
        earnCredits,
        activateHighlight,
    };
}
