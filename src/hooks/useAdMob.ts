'use client';

import { useEffect, useRef } from 'react';
import { isNative } from '@/lib/platform';

// Production Ad Unit IDs
const ADMOB_BANNER_ID = 'ca-app-pub-4603075992850630/5633559451';

// Google's official test Ad Unit ID for banners (safe to use during development)
// Never click real ads during testing — use this ID instead
const ADMOB_BANNER_TEST_ID = 'ca-app-pub-3940256099942544/6300978111';

// Set to true during development/testing, false for production
const IS_TESTING = true;

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
 * On web and PWA, this hook does nothing — no web ads are served.
 *
 * Policy compliance:
 * - UMP consent flow is executed before any ad request (GDPR / US state regs)
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
                console.log('[AdMob Banner] Starting init...');
                // Dynamically import to avoid bundling on web/SSR
                const {
                    AdMob,
                    BannerAdSize,
                    BannerAdPosition,
                    BannerAdPluginEvents,
                    AdmobConsentDebugGeography,
                    AdmobConsentStatus,
                } = await import('@capacitor-community/admob');

                console.log('[AdMob Banner] Requesting consent info...');
                const consentInfo = await AdMob.requestConsentInfo({
                    debugGeography: IS_TESTING
                        ? AdmobConsentDebugGeography.EEA
                        : AdmobConsentDebugGeography.DISABLED,
                    testDeviceIdentifiers: [],
                });
                console.log('[AdMob Banner] Consent status:', consentInfo.status, 'formAvailable:', consentInfo.isConsentFormAvailable);

                // If consent form is available and required, show it
                if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
                    console.log('[AdMob Banner] Showing consent form...');
                    await AdMob.showConsentForm();
                }

                console.log('[AdMob Banner] Initializing SDK...');
                await AdMob.initialize({
                    initializeForTesting: IS_TESTING,
                });
                console.log('[AdMob Banner] SDK initialized OK');

                if (!isMounted) return;

                // Reserve space immediately so the nav moves before the banner paints,
                // avoiding any overlap flash while SizeChanged hasn't fired yet.
                document.documentElement.style.setProperty(
                    '--ad-band-height',
                    `${PROVISIONAL_BANNER_HEIGHT_PX}px`
                );

                const adId = IS_TESTING ? ADMOB_BANNER_TEST_ID : ADMOB_BANNER_ID;
                console.log('[AdMob Banner] Showing banner with adId:', adId);
                const options = {
                    adId,
                    adSize: BannerAdSize.ADAPTIVE_BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 0,
                    isTesting: IS_TESTING,
                };

                await AdMob.showBanner(options);
                console.log('[AdMob Banner] showBanner() resolved OK');

                // Update to the exact rendered height once the SDK reports it.
                // This replaces the provisional value and keeps layout pixel-perfect.
                const listener = await AdMob.addListener(
                    BannerAdPluginEvents.SizeChanged,
                    (size: { width: number; height: number }) => {
                        console.log('[AdMob Banner] SizeChanged:', size);
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
                console.warn('[AdMob Banner] FAILED:', err);
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
