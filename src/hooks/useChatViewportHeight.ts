'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the correct chat container height using window.innerHeight.
 *
 * Since the chat page sets body/html overflow:hidden and removes main's
 * pb-20, the available height is simply:
 *   window.innerHeight - headerHeight - (footer on desktop)
 *
 * On mobile, the bottom nav is position:fixed so it doesn't affect layout flow,
 * but we still need to reserve space for it (4rem).
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

            const isMobile = window.matchMedia('(max-width: 767px)').matches;

            let subtract: number;
            if (isMobile) {
                // Bottom nav is fixed, h-16 (4rem) + safe-area-inset-bottom
                // We read the actual safe area since the bottom nav sits on it
                const sab = parseFloat(rootStyles.getPropertyValue('--sab').trim()) || 0;
                subtract = headerPx + 4 * remPx + sab;
            } else {
                // Desktop: footer (~3.5rem) + md:py-4 (2rem total vertical padding)
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
