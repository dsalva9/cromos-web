'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useInterstitialAdEngine } from '@/hooks/useInterstitialAd';
import { useCustomInterstitial } from '@/hooks/useCustomInterstitial';
import { useRouteChangeInterstitial } from '@/hooks/useRouteChangeInterstitial';
import { CustomInterstitialOverlay } from '@/components/ads/CustomInterstitialOverlay';
import { isNative } from '@/lib/platform';
import { safeStorage } from '@/lib/safeStorage';

// ── Context ────────────────────────────────────────────────────────────────

interface InterstitialAdContextValue {
    /**
     * Attempt to show an interstitial ad if all guards pass
     * (cooldown elapsed, session cap not reached, user is not patron/pro).
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
 * so it can read `profile.is_patron` and `profile.is_pro`.
 *
 * - On login / new session (Web + Android): displays `CustomInterstitialOverlay`
 *   if an active `'interstitial'` affiliate link is configured.
 * - On subsequent navigations / loadMore:
 *   - Android native: shows AdMob interstitial
 *   - Web (Desktop / Mobile): shows `CustomInterstitialOverlay`
 */
export function InterstitialAdProvider({ children }: { children: ReactNode }) {
    const { profile } = useProfileCompletion();
    const isPro = profile?.is_pro ?? (safeStorage.getItem('cc_is_pro') === 'true');
    const isPatron = profile?.is_patron ?? false;
    const isAdFree = Boolean(isPro || isPatron);

    const {
        affiliate,
        isVisible,
        showCustomInterstitial,
        dismissCustomInterstitial,
    } = useCustomInterstitial(isAdFree);

    const { maybeShowInterstitial, prepareAd } = useInterstitialAdEngine(
        isAdFree,
        showCustomInterstitial
    );

    // Watch section changes (desktop & mobile web navigation)
    useRouteChangeInterstitial(maybeShowInterstitial);

    // Pre-load the first AdMob interstitial on mount (native only)
    useEffect(() => {
        if (!isNative()) return;
        if (isAdFree) return;
        // Small delay so we don't compete with the banner ad for the first request
        const timer = setTimeout(() => { prepareAd(); }, 3000);
        return () => clearTimeout(timer);
    }, [isAdFree, prepareAd]);

    return (
        <InterstitialAdContext.Provider value={{ maybeShowInterstitial }}>
            {children}
            {isVisible && affiliate && !isAdFree && (
                <CustomInterstitialOverlay
                    affiliate={affiliate}
                    onClose={dismissCustomInterstitial}
                />
            )}
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
