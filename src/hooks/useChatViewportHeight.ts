'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the correct chat container height using window.innerHeight.
 *
 * Subtracts:
 * - Header height (--header-height CSS var)
 * - Safe area top (--sat CSS var, status bar on Capacitor)
 * - Mobile: bottom nav (4rem) + safe area bottom
 * - Desktop: footer (~3.5rem) + padding (2rem)
 */
export function useChatViewportHeight() {
    const [height, setHeight] = useState<string | undefined>(undefined);

    useEffect(() => {
        const computeHeight = () => {
            const rootStyles = getComputedStyle(document.documentElement);
            const remPx = parseFloat(rootStyles.fontSize) || 16;

            // --header-height: "4rem" mobile / "5rem" desktop
            const headerRem = parseFloat(
                rootStyles.getPropertyValue('--header-height').trim() || '4'
            );
            const headerPx = headerRem * remPx;

            // Safe area top (status bar on Capacitor/notch devices)
            const sat = parseFloat(rootStyles.getPropertyValue('--sat').trim()) || 0;

            const isMobile = window.matchMedia('(max-width: 767px)').matches;

            let subtract: number;
            if (isMobile) {
                // Bottom nav: h-16 (4rem) + safe area bottom
                const sab = parseFloat(rootStyles.getPropertyValue('--sab').trim()) || 0;
                subtract = headerPx + sat + 4 * remPx + sab;
            } else {
                // Desktop: footer (~3.5rem) + md:py-4 (2rem total)
                subtract = headerPx + sat + 3.5 * remPx + 2 * remPx;
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
