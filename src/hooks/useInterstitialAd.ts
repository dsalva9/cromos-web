'use client';

import { useRef, useCallback } from 'react';
import { isNative } from '@/lib/platform';
import { safeStorage } from '@/lib/safeStorage';
import { logger } from '@/lib/logger';

// ── Ad Unit IDs ────────────────────────────────────────────────────────────
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-4603075992850630/2878917537';
const ADMOB_INTERSTITIAL_TEST_ID = 'ca-app-pub-3940256099942544/1033173712';
const IS_TESTING = false;

// ── Throttle / Cap constants ───────────────────────────────────────────────
const INITIAL_COOLDOWN_MS = 1 * 60 * 1000; // 1 minute before first interstitial
const COOLDOWN_MS = 3 * 60 * 1000;         // 3 minutes between subsequent ones
const MAX_PER_SESSION = 5;                 // hard cap per app session

function getLastShownAt(): number {
    const v = safeStorage.getItem('interstitial_last_shown');
    if (!v) {
        const now = Date.now();
        safeStorage.setItem('interstitial_last_shown', String(now));
        return now;
    }
    return parseInt(v, 10);
}

function setLastShownAt(ts: number) {
    safeStorage.setItem('interstitial_last_shown', String(ts));
}

function getSessionCount(): number {
    const v = safeStorage.getItem('interstitial_session_count');
    const lastShown = getLastShownAt();
    // Reset session count if last ad was >30 min ago (new session proxy)
    if (Date.now() - lastShown > 30 * 60 * 1000) return 0;
    return v ? parseInt(v, 10) : 0;
}

function setSessionCount(n: number) {
    safeStorage.setItem('interstitial_session_count', String(n));
}

/**
 * Low-level interstitial ad engine.
 *
 * This hook manages the full lifecycle:
 *   1. Pre-loading an AdMob interstitial on native so it's ready instantly
 *   2. Enforcing a cooldown between impressions (1m initial / 3m subsequent)
 *   3. Capping at 5 impressions per session
 *   4. Skipping entirely for PRO / patrons (`isAdFree`)
 *   5. Routing Web (Desktop/Mobile) impressions to `onShowCustomInterstitial`
 */
export function useInterstitialAdEngine(
    isPatron: boolean,
    onShowCustomInterstitial?: () => Promise<boolean>
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admobRef = useRef<any>(null);
    const isAdReadyRef = useRef(false);
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
                    await admob.AdMob.initialize({ initializeForTesting: IS_TESTING });
                }

                const { AdMob } = admobRef.current;
                logger.debug('[Interstitial] Preparing ad unit:', IS_TESTING ? ADMOB_INTERSTITIAL_TEST_ID : ADMOB_INTERSTITIAL_ID);
                await AdMob.prepareInterstitial({
                    adId: IS_TESTING ? ADMOB_INTERSTITIAL_TEST_ID : ADMOB_INTERSTITIAL_ID,
                    isTesting: IS_TESTING,
                });

                logger.debug('[Interstitial] Ad loaded and ready');
                isAdReadyRef.current = true;
                return true;
            } catch (err) {
                logger.warnLocal('[Interstitial] Failed to prepare:', err);
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
     */
    const maybeShowInterstitial = useCallback(
        async (trigger: 'nav' | 'loadMore'): Promise<boolean> => {
            // ── Patron / PRO guard ──
            if (isPatron) {
                logger.debug('[Interstitial] Blocked: user is patron/pro');
                return false;
            }

            // ── Session cap guard ──
            const sc = getSessionCount();
            if (sc >= MAX_PER_SESSION) {
                logger.debug('[Interstitial] Blocked: session cap', sc, '>=', MAX_PER_SESSION);
                return false;
            }

            // ── Cooldown guard ──
            const cooldown = sc === 0 ? INITIAL_COOLDOWN_MS : COOLDOWN_MS;
            const lastShown = getLastShownAt();
            const elapsed = Date.now() - lastShown;
            if (elapsed < cooldown) {
                logger.debug('[Interstitial] Blocked: cooldown', Math.round(elapsed / 1000), 's <', cooldown / 1000, 's');
                return false;
            }

            logger.debug('[Interstitial] Guards passed! trigger=' + trigger, 'elapsed=' + Math.round(elapsed / 1000) + 's', 'sessionCount=' + sc);

            // ── Web (Desktop / Mobile Browser): show custom affiliate interstitial ──
            if (!isNative()) {
                if (onShowCustomInterstitial) {
                    return await onShowCustomInterstitial();
                }
                return false;
            }

            // ── Native Android: Ensure an AdMob ad is ready ──
            if (!isAdReadyRef.current) {
                logger.debug('[Interstitial] Ad not ready, preparing now...');
                const ready = await prepareAd();
                if (!ready) {
                    logger.debug('[Interstitial] Ad prepare failed, cannot show');
                    return false;
                }
            }

            // ── Show the ad ──
            try {
                const { AdMob, InterstitialAdPluginEvents } = admobRef.current;

                return new Promise<boolean>(async (resolve) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
                    let dismissedListener: any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
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
                            prepareAd();
                            resolve(true);
                        }
                    );

                    failedListener = await AdMob.addListener(
                        InterstitialAdPluginEvents.FailedToShow,
                        () => {
                            cleanup();
                            isAdReadyRef.current = false;
                            prepareAd();
                            resolve(false);
                        }
                    );

                    try {
                        await AdMob.showInterstitial();
                    } catch {
                        cleanup();
                        isAdReadyRef.current = false;
                        prepareAd();
                        resolve(false);
                    }
                });
            } catch (err) {
                logger.warnLocal('[AdMob Interstitial] Failed to show:', err);
                isAdReadyRef.current = false;
                return false;
            }
        },
        [isPatron, prepareAd, onShowCustomInterstitial]
    );

    return { maybeShowInterstitial, prepareAd };
}
