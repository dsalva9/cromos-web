'use client';

import { useEffect, useRef } from 'react';
import { isNative } from '@/lib/platform';

// Production Ad Unit IDs
const ADMOB_BANNER_ID = 'ca-app-pub-8347713301854118/3223436428';

// Google's official test Ad Unit ID for banners (safe to use during development)
// Never click real ads during testing — use this ID instead
const ADMOB_BANNER_TEST_ID = 'ca-app-pub-3940256099942544/6300978111';

// Set to true during development/testing, false for production
const IS_TESTING = false;

/**
 * Initialises the Google Mobile Ads SDK and shows a banner ad at the bottom
 * of the screen. Only runs on native Android (Capacitor).
 *
 * On web and PWA, this hook does nothing — Adsterra continues to handle ads there.
 *
 * Policy compliance:
 * - Banner is shown at BannerAdPosition.BOTTOM_CENTER (non-intrusive)
 * - Adaptive banner size used as recommended by Google
 * - isTesting flag controls test vs. production ads
 * - AdMob.initialize() is called once per app lifecycle
 */
export function useAdMob() {
    const initialised = useRef(false);

    useEffect(() => {
        if (!isNative()) return;
        if (initialised.current) return;
        initialised.current = true;

        let isMounted = true;

        async function initAndShowBanner() {
            try {
                // Dynamically import to avoid bundling on web/SSR
                const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');

                // Initialise the SDK — must be called before any ad requests
                // requestTrackingAuthorization() is a separate iOS-only call;
                // add it here when iOS support is implemented.
                await AdMob.initialize({
                    initializeForTesting: IS_TESTING,
                });

                if (!isMounted) return;

                const options = {
                    adId: IS_TESTING ? ADMOB_BANNER_TEST_ID : ADMOB_BANNER_ID,
                    adSize: BannerAdSize.ADAPTIVE_BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 0,
                    isTesting: IS_TESTING,
                };

                await AdMob.showBanner(options);
            } catch (err) {
                // Non-fatal: ads failing to load must never crash the app
                console.warn('[AdMob] Failed to initialise or show banner:', err);
            }
        }

        initAndShowBanner();

        return () => {
            isMounted = false;
            // Do NOT destroy/hide the banner on unmount — this hook lives in the root
            // layout and the banner should persist for the whole session
        };
    }, []);
}
