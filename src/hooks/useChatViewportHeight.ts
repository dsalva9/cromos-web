'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the correct chat container height for mobile devices.
 *
 * On mobile (< 768px), uses `window.innerHeight` to compute the available
 * height, subtracting the header and bottom nav/padding. This avoids
 * CSS `100dvh` which is unreliable in Capacitor's Android WebView.
 *
 * On desktop (>= 768px), returns `undefined` so the component uses
 * the CSS `calc()` approach instead.
 */
export function useChatViewportHeight() {
    const [height, setHeight] = useState<string | undefined>(undefined);

    useEffect(() => {
        const computeHeight = () => {
            // Only apply JS-based height on mobile
            const isMobile = window.matchMedia('(max-width: 767px)').matches;
            if (!isMobile) {
                setHeight(undefined);
                return;
            }

            // Read --header-height CSS variable (set by inline script in layout.tsx)
            const rootStyles = getComputedStyle(document.documentElement);
            const remPx = parseFloat(rootStyles.fontSize) || 16;

            // --header-height is "4rem" (mobile authed) or "7.5rem" (mobile unauthed)
            const headerRem = parseFloat(
                rootStyles.getPropertyValue('--header-height').trim() || '4'
            );
            const headerPx = headerRem * remPx;

            // <main> has pb-20 (5rem) to reserve space for the bottom nav
            const mainPbPx = 5 * remPx;

            // window.innerHeight is the actual visible viewport height,
            // accurate on all platforms including Capacitor WebView
            const available = window.innerHeight - headerPx - mainPbPx;
            setHeight(`${Math.max(available, 200)}px`);
        };

        computeHeight();
        window.addEventListener('resize', computeHeight);

        // Also recompute on orientation change (important for mobile)
        window.addEventListener('orientationchange', () => {
            // Small delay to let the browser settle the new viewport
            setTimeout(computeHeight, 150);
        });

        return () => {
            window.removeEventListener('resize', computeHeight);
        };
    }, []);

    return height;
}
