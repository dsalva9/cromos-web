'use client';

import { useEffect } from 'react';
import { isNative } from '@/lib/platform';

/**
 * Sets the --ad-band-height CSS variable on <html> so that layout,
 * nav, and FAB offsets react correctly to whether we're on native or web.
 *
 * Native Android: AdMob renders as a true native overlay above the WebView.
 * The useAdMob hook sets --ad-band-height to the actual banner height.
 *
 * Web / PWA: No web ads are served. Variable = 0.
 */
export function AdSpaceAdjuster() {
    useEffect(() => {
        // On web, always 0 — no web ads. On native, useAdMob sets the actual value.
        if (!isNative()) {
            document.documentElement.style.setProperty('--ad-band-height', '0px');
        }

        return () => {
            document.documentElement.style.removeProperty('--ad-band-height');
        };
    }, []);

    return null;
}
