'use client';

import { useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { AD_BANNER_HEIGHT } from '@/components/ads/AdBanner';

/**
 * Sets the --ad-band-height CSS variable on <html> so that layout,
 * nav, and FAB offsets react correctly to whether we're on native or web.
 *
 * Native Android: AdMob renders as a true native overlay above the WebView —
 * no web-side space needs to be reserved. Variable = 0.
 *
 * Web / PWA: Adsterra iframe bar takes AD_BANNER_HEIGHT px. Variable = that value.
 */
export function AdSpaceAdjuster() {
    useEffect(() => {
        const height = isNative() ? 0 : AD_BANNER_HEIGHT;
        document.documentElement.style.setProperty('--ad-band-height', `${height}px`);

        return () => {
            document.documentElement.style.removeProperty('--ad-band-height');
        };
    }, []);

    return null;
}
