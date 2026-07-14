'use client';

import { useState, useRef, useCallback } from 'react';
import { isNative } from '@/lib/platform';

// Production rewarded ad unit ID (CambioCromos AdMob account)
const ADMOB_REWARDED_ID = 'ca-app-pub-8347713301854118/7122569822';

// Google's official test rewarded ad unit ID — safe for development
const ADMOB_REWARDED_TEST_ID = 'ca-app-pub-3940256099942544/5224354917';

// Match the banner hook: false = production ads
const IS_TESTING = false;

/**
 * Manages a single rewarded ad lifecycle for the Android Capacitor app.
 *
 * Usage:
 *   const { loadAd, showRewardedAd, isLoading, isLoaded } = useRewardedAd();
 *
 *   // When modal opens:
 *   await loadAd();
 *
 *   // When user taps "Watch ad":
 *   const rewarded = await showRewardedAd();
 *   if (rewarded) { // grant credits }
 *
 * Returns no-ops on web/SSR — only runs on native Android.
 *
 * Policy compliance:
 * - AdMob SDK is already initialised by useAdMob (banner hook)
 * - Only shows ad after explicit user action — never auto-plays
 * - Reward is granted only on the Rewarded event (user completed ad)
 */
export function useRewardedAd() {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const admobRef = useRef<any>(null);
    const loadPromiseRef = useRef<Promise<boolean> | null>(null);

    /** Pre-load a rewarded ad so it's ready immediately when the user taps. */
    const loadAd = useCallback(async (): Promise<boolean> => {
        if (!isNative()) return false;
        if (isLoaded) return true;
        if (loadPromiseRef.current) return loadPromiseRef.current;

        const promise = (async () => {
            setIsLoading(true);
            try {
                // Lazy import — never bundled on web/SSR
                if (!admobRef.current) {
                    const admob = await import('@capacitor-community/admob');
                    admobRef.current = admob;
                    // initialize() is idempotent — safe to call even if banner already did it
                    await admob.AdMob.initialize({ initializeForTesting: IS_TESTING });
                }

                const { AdMob } = admobRef.current;
                await AdMob.prepareRewardVideoAd({
                    adId: IS_TESTING ? ADMOB_REWARDED_TEST_ID : ADMOB_REWARDED_ID,
                    isTesting: IS_TESTING,
                });
                setIsLoaded(true);
                return true;
            } catch (err) {
                console.warn('[AdMob Rewarded] Failed to load:', err);
                setIsLoaded(false);
                return false;
            } finally {
                setIsLoading(false);
                loadPromiseRef.current = null;
            }
        })();

        loadPromiseRef.current = promise;
        return promise;
    }, [isLoaded]);

    /**
     * Show the preloaded rewarded ad.
     * Resolves true if the user watched fully and earned the reward.
     * Resolves false if the user dismissed early or an error occurred.
     */
    const showRewardedAd = useCallback(async (): Promise<boolean> => {
        if (!isNative()) return false;

        // Ensure it is loaded (await the active load promise, or start loading if not loaded)
        if (!isLoaded) {
            const success = await loadAd();
            if (!success) return false;
        }

        if (!admobRef.current) return false;

        return new Promise(async (resolve) => {
            try {
                const { AdMob, RewardAdPluginEvents } = admobRef.current;

                let rewarded = false;

                const rewardListener = await AdMob.addListener(
                    RewardAdPluginEvents.Rewarded,
                    () => { rewarded = true; }
                );

                const dismissedListener = await AdMob.addListener(
                    RewardAdPluginEvents.Dismissed,
                    () => {
                        rewardListener.remove();
                        dismissedListener.remove();
                        setIsLoaded(false); // ad consumed — need to load another
                        resolve(rewarded);
                    }
                );

                // Also handle failed-to-show
                const failedListener = await AdMob.addListener(
                    RewardAdPluginEvents.FailedToShow,
                    () => {
                        rewardListener.remove();
                        dismissedListener.remove();
                        failedListener.remove();
                        setIsLoaded(false);
                        resolve(false);
                    }
                );

                await AdMob.showRewardVideoAd();
            } catch (err) {
                console.warn('[AdMob Rewarded] Failed to show:', err);
                setIsLoaded(false);
                resolve(false);
            }
        });
    }, [isLoaded, loadAd]);

    return { loadAd, showRewardedAd, isLoading, isLoaded };
}
