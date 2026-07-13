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

// Provisional height applied immediately before the banner loads so the nav
// moves up before the actual SizeChanged event fires (avoids overlap flash).
const PROVISIONAL_BANNER_HEIGHT_PX = 60;

/**
 * Initialises the Google Mobile Ads SDK and shows a banner ad at the bottom
 * of the screen. Only runs on native Android (Capacitor).
 *
 * Updates the CSS variable --ad-band-height to the actual rendered banner
 * height so MobileBottomNav, FloatingActionBtn and <main> all float above it.
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
        let removeListener: (() => void) | undefined;

        async function initAndShowBanner() {
            try {
                // Dynamically import to avoid bundling on web/SSR
                const { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } =
                    await import('@capacitor-community/admob');

                // Initialise the SDK — must be called before any ad requests
                // requestTrackingAuthorization() is a separate iOS-only call;
                // add it here when iOS support is implemented.
                await AdMob.initialize({
                    initializeForTesting: IS_TESTING,
                });

                if (!isMounted) return;

                // Reserve space immediately so the nav moves before the banner paints,
                // avoiding any overlap flash while SizeChanged hasn't fired yet.
                document.documentElement.style.setProperty(
                    '--ad-band-height',
                    `${PROVISIONAL_BANNER_HEIGHT_PX}px`
                );

                const options = {
                    adId: IS_TESTING ? ADMOB_BANNER_TEST_ID : ADMOB_BANNER_ID,
                    adSize: BannerAdSize.ADAPTIVE_BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 0,
                    isTesting: IS_TESTING,
                };

                await AdMob.showBanner(options);

                // Update to the exact rendered height once the SDK reports it.
                // This replaces the provisional value and keeps layout pixel-perfect.
                const listener = await AdMob.addListener(
                    BannerAdPluginEvents.SizeChanged,
                    (size: { width: number; height: number }) => {
                        if (size?.height) {
                            document.documentElement.style.setProperty(
                                '--ad-band-height',
                                `${Math.round(size.height)}px`
                            );
                        }
                    }
                );

                removeListener = () => listener.remove();
            } catch (err) {
                // Non-fatal: ads failing to load must never crash the app.
                // Reset height so the nav returns to the bottom.
                console.warn('[AdMob] Failed to initialise or show banner:', err);
                document.documentElement.style.setProperty('--ad-band-height', '0px');
            }
        }

        initAndShowBanner();

        return () => {
            isMounted = false;
            removeListener?.();
            // Do NOT destroy/hide the banner on unmount — this hook lives in the root
            // layout and the banner should persist for the whole session
        };
    }, []);
}
