'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isNative } from '@/lib/platform';
import { isAdBannerHidden } from '@/components/ads/AdBanner';
import { logger } from '@/lib/logger';

// Production Ad Unit IDs
const ADMOB_BANNER_ID = 'ca-app-pub-4603075992850630/5633559451';

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
 * On web and PWA, this hook does nothing — no web ads are served.
 *
 * Policy compliance & route handling:
 * - Never shows banners on auth/excluded routes (/login, /signup, /forgot-password, /profile/reset-password, etc.)
 * - UMP consent flow is executed before any ad request (GDPR / US state regs)
 * - Banner is shown at BannerAdPosition.BOTTOM_CENTER (non-intrusive)
 * - Adaptive banner size used as recommended by Google
 * - isTesting flag controls test vs. production ads
 * - AdMob.initialize() is called once per app lifecycle
 */
export function useAdMob(isPro = false, loading = false) {
    const rawPathname = usePathname();
    const currentPath = rawPathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    const isHidden = isAdBannerHidden(currentPath);

    // Track state across renders
    const sdkInitialisedRef = useRef(false);
    const bannerShowingRef = useRef(false);
    const listenerAttachedRef = useRef(false);

    // Refs for accessing latest state inside async callbacks
    const isHiddenRef = useRef(isHidden);
    isHiddenRef.current = isHidden;
    const isProRef = useRef(isPro);
    isProRef.current = isPro;

    useEffect(() => {
        if (!isNative()) return;

        // If user is PRO or currently on an auth/excluded route (e.g. /login)
        if (isPro || isHidden) {
            document.documentElement.style.setProperty('--ad-band-height', '0px');
            bannerShowingRef.current = false;
            (async () => {
                try {
                    const { AdMob } = await import('@capacitor-community/admob');
                    await AdMob.removeBanner().catch(() => AdMob.hideBanner());
                } catch {
                    // Non-fatal if AdMob is not initialised yet
                }
            })();
            return;
        }

        // Wait until profile completion / auth state resolves before requesting ads
        if (loading) return;

        // Banner is already showing and allowed — keep it active without reload/flicker
        if (bannerShowingRef.current) return;

        let isMounted = true;

        async function initAndShowBanner() {
            try {
                // Dynamically import to avoid bundling on web/SSR
                const {
                    AdMob,
                    BannerAdSize,
                    BannerAdPosition,
                    BannerAdPluginEvents,
                    AdmobConsentDebugGeography,
                    AdmobConsentStatus,
                } = await import('@capacitor-community/admob');

                // ── UMP Consent Flow & SDK Init (only once per app lifecycle) ──
                if (!sdkInitialisedRef.current) {
                    try {
                        const consentInfo = await AdMob.requestConsentInfo({
                            debugGeography: IS_TESTING
                                ? AdmobConsentDebugGeography.EEA
                                : AdmobConsentDebugGeography.DISABLED,
                            testDeviceIdentifiers: [],
                        });

                        if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
                            await AdMob.showConsentForm();
                        }
                    } catch (consentErr) {
                        logger.warn('[AdMob] Consent flow failed (non-fatal, proceeding):', consentErr);
                    }

                    await AdMob.initialize({
                        initializeForTesting: IS_TESTING,
                    });
                    sdkInitialisedRef.current = true;
                }

                // Guard against navigation that happened while initializing
                if (!isMounted || isHiddenRef.current || isProRef.current) {
                    document.documentElement.style.setProperty('--ad-band-height', '0px');
                    bannerShowingRef.current = false;
                    await AdMob.removeBanner().catch(() => AdMob.hideBanner());
                    return;
                }

                // Reserve space immediately so the nav moves before the banner paints
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
                bannerShowingRef.current = true;

                // Double check if user navigated away while showBanner was in flight
                if (!isMounted || isHiddenRef.current || isProRef.current) {
                    document.documentElement.style.setProperty('--ad-band-height', '0px');
                    bannerShowingRef.current = false;
                    await AdMob.removeBanner().catch(() => AdMob.hideBanner());
                    return;
                }

                // Attach SizeChanged listener only once
                if (!listenerAttachedRef.current) {
                    listenerAttachedRef.current = true;
                    await AdMob.addListener(
                        BannerAdPluginEvents.SizeChanged,
                        (size: { width: number; height: number }) => {
                            if (bannerShowingRef.current && !isHiddenRef.current && !isProRef.current) {
                                if (typeof size?.height === 'number' && size.height > 0) {
                                    document.documentElement.style.setProperty(
                                        '--ad-band-height',
                                        `${Math.round(size.height)}px`
                                    );
                                }
                            } else {
                                document.documentElement.style.setProperty('--ad-band-height', '0px');
                            }
                        }
                    );
                }
            } catch (err) {
                // Non-fatal: ads failing to load must never crash the app.
                logger.warn('[AdMob] Failed to initialise or show banner:', err);
                document.documentElement.style.setProperty('--ad-band-height', '0px');
                bannerShowingRef.current = false;
            }
        }

        initAndShowBanner();

        return () => {
            isMounted = false;
        };
    }, [isPro, loading, isHidden]);
}
