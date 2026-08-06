'use client';

import { useRef, useCallback } from 'react';
import { isNative } from '@/lib/platform';

// ── Ad Unit IDs ────────────────────────────────────────────────────────────
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-4603075992850630/3307879099';
const ADMOB_INTERSTITIAL_TEST_ID = 'ca-app-pub-3940256099942544/1033173712';
const IS_TESTING = true;

// ── Throttle / Cap constants ───────────────────────────────────────────────
const COOLDOWN_MS = 4 * 60 * 1000; // 4 minutes between interstitials
const MAX_PER_SESSION = 5;          // hard cap per app session

/**
 * Low-level interstitial ad engine.
 *
 * This hook manages the full lifecycle:
 *   1. Pre-loading an interstitial so it's ready instantly
 *   2. Enforcing a 4-minute cooldown between impressions
 *   3. Capping at 5 impressions per session
 *   4. Tracking "Load More" presses so we only fire from the 2nd onwards
 *   5. Skipping entirely for patrons (`is_patron`)
 *
 * The hook is consumed by `InterstitialAdProvider` which wraps it in a
 * React context so any component in the tree can call `maybeShowInterstitial`.
 *
 * On web / SSR this is a complete no-op — the Capacitor AdMob plugin is
 * never imported.
 */
export function useInterstitialAdEngine(isPatron: boolean) {
    // ── Mutable refs (persist across renders, never trigger re-render) ──
    const admobRef = useRef<any>(null);
    const isAdReadyRef = useRef(false);
    const lastShownAtRef = useRef(Date.now()); // cooldown starts at login
    const sessionCountRef = useRef(0);
    const loadMoreCountRef = useRef(0);
    const preparePromiseRef = useRef<Promise<boolean> | null>(null);

    /**
     * Pre-load an interstitial so it's available instantly when a trigger fires.
     * Deduplicates concurrent calls via `preparePromiseRef`.
     */
    const prepareAd = useCallback(async (): Promise<boolean> => {
        if (!isNative()) return false;
        if (isAdReadyRef.current) return true;
        if (preparePromiseRef.current) return preparePromiseRef.current;

        const promise = (async () => {
            try {
                if (!admobRef.current) {
                    const admob = await import('@capacitor-community/admob');
                    admobRef.current = admob;
                    // initialize() is idempotent — safe even if banner already called it
                    await admob.AdMob.initialize({ initializeForTesting: IS_TESTING });
                }

                const { AdMob } = admobRef.current;
                await AdMob.prepareInterstitial({
                    adId: IS_TESTING ? ADMOB_INTERSTITIAL_TEST_ID : ADMOB_INTERSTITIAL_ID,
                    isTesting: IS_TESTING,
                });

                isAdReadyRef.current = true;
                return true;
            } catch (err) {
                console.warn('[AdMob Interstitial] Failed to prepare:', err);
                isAdReadyRef.current = false;
                return false;
            } finally {
                preparePromiseRef.current = null;
            }
        })();

        preparePromiseRef.current = promise;
        return promise;
    }, []);

    /**
     * Attempt to show an interstitial ad.
     *
     * @param trigger - `'nav'` for section/menu navigation, `'loadMore'` for
     *   marketplace pagination.
     * @returns `true` if an ad was shown, `false` if any guard blocked it.
     *
     * Guards (in order):
     *   1. Not native → skip
     *   2. User is patron → skip
     *   3. Session cap reached → skip
     *   4. Cooldown not elapsed → skip
     *   5. loadMore trigger and < 2 presses → skip (only 2nd+ press)
     */
    const maybeShowInterstitial = useCallback(
        async (trigger: 'nav' | 'loadMore'): Promise<boolean> => {
            // ── Platform guard ──
            if (!isNative()) return false;

            // ── Patron guard ──
            if (isPatron) return false;

            // ── Session cap guard ──
            if (sessionCountRef.current >= MAX_PER_SESSION) return false;

            // ── Cooldown guard ──
            if (Date.now() - lastShownAtRef.current < COOLDOWN_MS) return false;

            // ── Load More frequency guard ──
            if (trigger === 'loadMore') {
                loadMoreCountRef.current += 1;
                if (loadMoreCountRef.current < 2) return false;
            }

            // ── Ensure an ad is ready ──
            if (!isAdReadyRef.current) {
                const ready = await prepareAd();
                if (!ready) return false;
            }

            // ── Show the ad ──
            try {
                const { AdMob, InterstitialAdPluginEvents } = admobRef.current;

                return new Promise<boolean>(async (resolve) => {
                    let dismissedListener: any;
                    let failedListener: any;

                    const cleanup = () => {
                        if (dismissedListener) dismissedListener.remove();
                        if (failedListener) failedListener.remove();
                    };

                    dismissedListener = await AdMob.addListener(
                        InterstitialAdPluginEvents.Dismissed,
                        () => {
                            cleanup();
                            isAdReadyRef.current = false;
                            lastShownAtRef.current = Date.now();
                            sessionCountRef.current += 1;
                            // Pre-load the next ad
                            prepareAd();
                            resolve(true);
                        }
                    );

                    failedListener = await AdMob.addListener(
                        InterstitialAdPluginEvents.FailedToShow,
                        () => {
                            cleanup();
                            isAdReadyRef.current = false;
                            // Pre-load a replacement
                            prepareAd();
                            resolve(false);
                        }
                    );

                    try {
                        await AdMob.showInterstitial();
                    } catch (showErr) {
                        cleanup();
                        isAdReadyRef.current = false;
                        prepareAd();
                        resolve(false);
                    }
                });
            } catch (err) {
                console.warn('[AdMob Interstitial] Failed to show:', err);
                isAdReadyRef.current = false;
                return false;
            }
        },
        [isPatron, prepareAd]
    );

    return { maybeShowInterstitial, prepareAd };
}
