'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the correct chat container height for the current platform.
 *
 * Uses `window.innerHeight` to compute the available height, subtracting
 * the header and bottom padding. This avoids CSS `100dvh` issues across
 * all platforms (Capacitor WebView, mobile web, desktop).
 *
 * - Mobile: subtracts header + main pb-20 (bottom nav space)
 * - Desktop: subtracts header + footer (~3.5rem) + md:py-4 padding
 */
export function useChatViewportHeight() {
    const [height, setHeight] = useState<string | undefined>(undefined);

    useEffect(() => {
        const computeHeight = () => {
            const rootStyles = getComputedStyle(document.documentElement);
            const remPx = parseFloat(rootStyles.fontSize) || 16;

            // --header-height is "4rem" (mobile) or "5rem" (desktop sm+)
            const headerRem = parseFloat(
                rootStyles.getPropertyValue('--header-height').trim() || '4'
            );
            const headerPx = headerRem * remPx;

            const isMobile = window.matchMedia('(max-width: 767px)').matches;

            let subtract: number;
            if (isMobile) {
                // <main> has pb-20 (5rem) for the mobile bottom nav
                subtract = headerPx + 5 * remPx;
            } else {
                // Desktop: footer is ~3.5rem, plus md:py-4 (2rem top+bottom padding)
                subtract = headerPx + 3.5 * remPx + 2 * remPx;
            }

            const available = window.innerHeight - subtract;
            setHeight(`${Math.max(available, 200)}px`);
        };

        computeHeight();
        window.addEventListener('resize', computeHeight);
        return () => window.removeEventListener('resize', computeHeight);
    }, []);

    return height;
}
