'use client';

import { useState, useEffect } from 'react';
import { isNative } from '@/lib/platform';

/**
 * Returns the correct chat container height for the current platform.
 *
 * - **Capacitor (native)**: Uses `window.innerHeight` minus header and bottom
 *   nav heights, because `100dvh` in the Android WebView includes system bars
 *   and doesn't match the visible area.
 * - **Web / PWA**: Returns `undefined` so the component falls back to the
 *   CSS `calc()` approach (which works correctly in real browsers).
 */
export function useChatViewportHeight() {
    const [height, setHeight] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!isNative()) return; // web/PWA — let CSS handle it

        const computeHeight = () => {
            // Read the CSS variable set by the inline script in layout.tsx
            const headerHeight = parseFloat(
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--header-height')
                    .trim() || '4'
            );
            // Convert rem to px
            const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const headerPx = headerHeight * remPx;

            // Bottom nav: h-16 (4rem) + env(safe-area-inset-bottom)
            const bottomNavPx = 4 * remPx;

            // main has pb-20 (5rem) which accounts for the bottom nav, but we need
            // to subtract the actual visible chrome from window.innerHeight
            const mainPaddingBottom = 5 * remPx;

            const available = window.innerHeight - headerPx - mainPaddingBottom;
            setHeight(`${Math.max(available, 300)}px`);
        };

        computeHeight();
        window.addEventListener('resize', computeHeight);
        return () => window.removeEventListener('resize', computeHeight);
    }, []);

    return height;
}
