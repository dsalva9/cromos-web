'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/hooks/use-router';
import { Capacitor } from '@capacitor/core';
import { isPWA } from '@/lib/platform';
import { logger } from '@/lib/logger';

// useLayoutEffect on client (runs synchronously before paint), useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface NativeRedirectHandlerProps {
    isAuthenticated: boolean;
    children: ReactNode;
}

/**
 * Handles app-shell-only side effects (Capacitor native + PWA):
 * - Redirects unauthenticated app-shell users to /login
 * - Hides the Capacitor splash screen after routing
 * - Handles password recovery hash redirects
 *
 * On native/PWA platforms, this component suppresses its children BEFORE the
 * browser paints (via useLayoutEffect), preventing the landing page from
 * flickering before the /login redirect.
 *
 * On regular web, children render immediately (SSR-safe).
 */
export default function NativeRedirectHandler({ isAuthenticated, children }: NativeRedirectHandlerProps) {
    const router = useRouter();
    const [isAppShell, setIsAppShell] = useState<boolean | null>(null);

    // Synchronously detect native/PWA platform BEFORE browser paint.
    useIsomorphicLayoutEffect(() => {
        try {
            setIsAppShell(Capacitor.isNativePlatform() || isPWA());
        } catch {
            setIsAppShell(false);
        }
    }, []);

    // Handle password recovery redirect (works on both web and native)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            router.push(`/profile/reset-password${hash}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- router excluded to prevent infinite loops (Next.js 16 transition bug)
    }, []); // Only run once on mount

    // Handle app-shell redirect and splash screen (async, runs after paint)
    useEffect(() => {
        if (isAppShell === null) return; // Wait for detection
        if (!isAppShell) return; // Regular web, nothing to do

        if (!isAuthenticated) {
            router.replace('/login');
        }

        // Hide Capacitor splash screen (only relevant for native, not PWA)
        if (Capacitor.isNativePlatform()) {
            import('@capacitor/splash-screen').then(({ SplashScreen }) => {
                if (Capacitor.isPluginAvailable('SplashScreen')) {
                    setTimeout(() => SplashScreen.hide(), 500);
                } else {
                    logger.debug('SplashScreen plugin not available, skipping hide');
                }
            }).catch(() => {
                logger.debug('SplashScreen plugin not installed');
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- router excluded (Next.js 16 transition bug)
    }, [isAppShell, isAuthenticated]);

    // SSR / initial hydration render: isAppShell is null, show children (matches server HTML)
    if (isAppShell === null) {
        return <>{children}</>;
    }

    if (isAppShell && !isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

