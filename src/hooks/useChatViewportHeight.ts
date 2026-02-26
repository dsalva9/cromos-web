'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the correct chat container height for desktop only.
 *
 * On mobile, the chat uses CSS fixed positioning (top/bottom), so no
 * JS height calculation is needed.
 *
 * On desktop (>= 768px), computes the available height from
 * window.innerHeight minus header, footer, and padding.
 */
export function useChatViewportHeight() {
    const [isDesktop, setIsDesktop] = useState(false);
    const [height, setHeight] = useState<string | undefined>(undefined);

    useEffect(() => {
        const computeHeight = () => {
            const isMd = window.matchMedia('(min-width: 768px)').matches;
            setIsDesktop(isMd);

            if (!isMd) {
                // Mobile uses CSS fixed positioning — no JS height needed
                setHeight(undefined);
                return;
            }

            const rootStyles = getComputedStyle(document.documentElement);
            const remPx = parseFloat(rootStyles.fontSize) || 16;

            const headerRem = parseFloat(
                rootStyles.getPropertyValue('--header-height').trim() || '5'
            );
            const headerPx = headerRem * remPx;
            const sat = parseFloat(rootStyles.getPropertyValue('--sat').trim()) || 0;

            // Desktop: header + SAT + footer (~3.5rem) + py-4 (2rem)
            const subtract = headerPx + sat + 3.5 * remPx + 2 * remPx;
            const available = window.innerHeight - subtract;
            setHeight(`${Math.max(available, 200)}px`);
        };

        computeHeight();
        window.addEventListener('resize', computeHeight);
        return () => window.removeEventListener('resize', computeHeight);
    }, []);

    return { height, isDesktop };
}
