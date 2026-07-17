'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

/** Credits awarded per completed rewarded ad. Must match DB grant logic. */
export const CREDITS_PER_AD = 10;

/** Credit costs per highlight duration. Must match activate_highlight RPC. */
export const HIGHLIGHT_COSTS: Record<'48_hours' | '7_days', number> = {
    '48_hours': 100,
    '7_days': 300,
};

/** Max credits earnable per day from rewarded ads. Must match DB daily cap. */
export const DAILY_AD_CREDIT_CAP = 300;

/**
 * Manages the current user's highlight credit balance.
 *
 * - Fetches balance on mount via get_my_highlight_credits RPC
 * - Provides earnCredits() for rewarded-ad credit grants (via SSV polling)
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
            return data?.balance ?? 0;
        } catch (err) {
            console.warn('[HighlightCredits] Failed to fetch balance:', err);
            return balance;
        } finally {
            setLoading(false);
        }
    }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    /**
     * Called after a user successfully completes a rewarded ad.
     *
     * With SSV enabled, credits are granted server-side by Google's callback
     * to our admob-ssv-callback edge function. This method polls the balance
     * until it increases (indicating the SSV callback was processed) or times out.
     *
     * Returns the new balance on success.
     * Throws 'credit_grant_timeout' if the SSV callback isn't processed in time.
     * Throws 'rate_limited' or 'daily_limit_reached' from the RPC if applicable.
     */
    const earnCredits = useCallback(async (): Promise<number> => {
        // Capture current balance fresh from the DB
        const { data: currentData } = await (supabase as any).rpc('get_my_highlight_credits');
        const startBalance = currentData?.balance ?? 0;

        // Poll for balance increase (SSV callback grants credits server-side)
        const maxAttempts = 10;
        const delayMs = 1500; // 1.5 seconds between polls

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));

            const { data } = await (supabase as any).rpc('get_my_highlight_credits');
            const newBalance = data?.balance ?? 0;

            if (newBalance > startBalance) {
                setBalance(newBalance);
                return newBalance;
            }
        }

        // Final attempt — the SSV callback may have just been processed
        const { data: finalData } = await (supabase as any).rpc('get_my_highlight_credits');
        const finalBalance = finalData?.balance ?? 0;

        if (finalBalance > startBalance) {
            setBalance(finalBalance);
            return finalBalance;
        }

        // SSV callback hasn't been processed within ~15 seconds
        throw new Error('credit_grant_timeout');
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
