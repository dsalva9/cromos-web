'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useInterstitialAdEngine } from '@/hooks/useInterstitialAd';
import { isNative } from '@/lib/platform';

// ── Context ────────────────────────────────────────────────────────────────

interface InterstitialAdContextValue {
    /**
     * Attempt to show an interstitial ad if all guards pass
     * (cooldown elapsed, session cap not reached, user is not patron).
     *
     * @param trigger - `'nav'` for section changes, `'loadMore'` for marketplace.
     * @returns `true` if an ad was shown.
     */
    maybeShowInterstitial: (trigger: 'nav' | 'loadMore') => Promise<boolean>;
}

const InterstitialAdContext = createContext<InterstitialAdContextValue>({
    maybeShowInterstitial: async () => false,
});

// ── Provider ───────────────────────────────────────────────────────────────

/**
 * Wraps the app tree and provides `maybeShowInterstitial` via React context.
 *
 * Must be placed below `ProfileCompletionProvider` in the component tree
 * so it can read `profile.is_patron`.
 *
 * On web/SSR the context value is a no-op — no ads are ever loaded or shown.
 */
export function InterstitialAdProvider({ children }: { children: ReactNode }) {
    const { profile } = useProfileCompletion();
    const isPatron = profile?.is_patron ?? false;

    const { maybeShowInterstitial, prepareAd } = useInterstitialAdEngine(isPatron);

    // Pre-load the first interstitial on mount (native only)
    useEffect(() => {
        if (!isNative()) return;
        if (isPatron) return;
        // Small delay so we don't compete with the banner ad for the first request
        const timer = setTimeout(() => { prepareAd(); }, 3000);
        return () => clearTimeout(timer);
    }, [isPatron, prepareAd]);

    return (
        <InterstitialAdContext.Provider value={{ maybeShowInterstitial }}>
            {children}
        </InterstitialAdContext.Provider>
    );
}

// ── Consumer hook ──────────────────────────────────────────────────────────

/**
 * Access the interstitial ad context.
 *
 * ```tsx
 * const { maybeShowInterstitial } = useInterstitialAd();
 * await maybeShowInterstitial('nav');
 * ```
 */
export function useInterstitialAd() {
    return useContext(InterstitialAdContext);
}
