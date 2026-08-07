'use client';

import { useRef, useCallback } from 'react';
import { isNative } from '@/lib/platform';

// ── Ad Unit IDs ────────────────────────────────────────────────────────────
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-4603075992850630/2878917537';
const ADMOB_INTERSTITIAL_TEST_ID = 'ca-app-pub-3940256099942544/1033173712';
const IS_TESTING = false;

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
    const preparePromiseRef = useRef<Promise<boolean> | null>(null);

    // ── localStorage-backed state (survives hard navigation reloads) ──
    // window.location.href causes full page reloads, which reset all useRef
    // values. We persist cooldown/session state in localStorage so the
    // 4-minute cooldown can actually elapse across navigations.
    const getLastShownAt = (): number => {
        try {
            const v = localStorage.getItem('interstitial_last_shown');
            return v ? parseInt(v, 10) : 0;  // 0 = epoch = cooldown already elapsed on first visit
        } catch { return 0; }
    };
    const setLastShownAt = (ts: number) => {
        try { localStorage.setItem('interstitial_last_shown', String(ts)); } catch {}
    };
    const getSessionCount = (): number => {
        try {
            const v = localStorage.getItem('interstitial_session_count');
            const lastShown = getLastShownAt();
            // Reset session count if last ad was >30 min ago (new session proxy)
            if (Date.now() - lastShown > 30 * 60 * 1000) return 0;
            return v ? parseInt(v, 10) : 0;
        } catch { return 0; }
    };
    const setSessionCount = (n: number) => {
        try { localStorage.setItem('interstitial_session_count', String(n)); } catch {}
    };
    const loadMoreCountRef = useRef(0);


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
                    await admob.AdMob.initialize({ initializeForTesting: IS_TESTING });
                }

                const { AdMob } = admobRef.current;
                console.log('[Interstitial] Preparing ad unit:', IS_TESTING ? ADMOB_INTERSTITIAL_TEST_ID : ADMOB_INTERSTITIAL_ID);
                await AdMob.prepareInterstitial({
                    adId: IS_TESTING ? ADMOB_INTERSTITIAL_TEST_ID : ADMOB_INTERSTITIAL_ID,
                    isTesting: IS_TESTING,
                });

                console.log('[Interstitial] ✅ Ad loaded and ready');
                isAdReadyRef.current = true;
                return true;
            } catch (err) {
                console.warn('[Interstitial] ❌ Failed to prepare:', err);
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
            if (isPatron) {
                console.log('[Interstitial] Blocked: user is patron');
                return false;
            }

            // ── Session cap guard ──
            const sc = getSessionCount();
            if (sc >= MAX_PER_SESSION) {
                console.log('[Interstitial] Blocked: session cap', sc, '>=', MAX_PER_SESSION);
                return false;
            }

            // ── Cooldown guard ──
            const lastShown = getLastShownAt();
            const elapsed = Date.now() - lastShown;
            if (elapsed < COOLDOWN_MS) {
                console.log('[Interstitial] Blocked: cooldown', Math.round(elapsed/1000), 's <', COOLDOWN_MS/1000, 's');
                return false;
            }

            console.log('[Interstitial] Guards passed! trigger=' + trigger, 'elapsed=' + Math.round(elapsed/1000) + 's', 'sessionCount=' + sc);

            // ── Load More frequency guard ──
            if (trigger === 'loadMore') {
                loadMoreCountRef.current += 1;
                if (loadMoreCountRef.current < 2) {
                    console.log('[Interstitial] Blocked: loadMore count', loadMoreCountRef.current, '< 2');
                    return false;
                }
            }

            // ── Ensure an ad is ready ──
            if (!isAdReadyRef.current) {
                console.log('[Interstitial] Ad not ready, preparing now...');
                const ready = await prepareAd();
                if (!ready) {
                    console.log('[Interstitial] ❌ Ad prepare failed, cannot show');
                    return false;
                }
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
                            setLastShownAt(Date.now());
                            setSessionCount(getSessionCount() + 1);
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
