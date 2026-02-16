'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/hooks/use-router';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';

// useLayoutEffect on client (runs synchronously before paint), useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface NativeRedirectHandlerProps {
    isAuthenticated: boolean;
    children: ReactNode;
}

/**
 * Handles Capacitor/native-only side effects:
 * - Redirects unauthenticated native users to /login
 * - Hides the Capacitor splash screen after routing
 * - Handles password recovery hash redirects
 *
 * On native platforms, this component suppresses its children BEFORE the
 * browser paints (via useLayoutEffect), preventing the landing page from
 * flickering before the /login redirect.
 *
 * On web, children render immediately (SSR-safe).
 */
export default function NativeRedirectHandler({ isAuthenticated, children }: NativeRedirectHandlerProps) {
    const router = useRouter();
    const [isNative, setIsNative] = useState<boolean | null>(null);

    // Synchronously detect native platform BEFORE browser paint.
    // Capacitor's native bridge injects window.Capacitor before page JS runs,
    // and @capacitor/core is statically imported by DeepLinkHandler in the layout,
    // so Capacitor.isNativePlatform() is available synchronously.
    useIsomorphicLayoutEffect(() => {
        try {
            setIsNative(Capacitor.isNativePlatform());
        } catch {
            setIsNative(false);
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

    // Handle native redirect and splash screen (async, runs after paint)
    useEffect(() => {
        if (isNative === null) return; // Wait for detection
        if (!isNative) return; // Not native, nothing to do

        if (!isAuthenticated) {
            router.replace('/login');
        }

        // Hide splash screen after a short delay to ensure navigation has started
        import('@capacitor/splash-screen').then(({ SplashScreen }) => {
            if (Capacitor.isPluginAvailable('SplashScreen')) {
                setTimeout(() => SplashScreen.hide(), 500);
            } else {
                logger.debug('SplashScreen plugin not available, skipping hide');
            }
        }).catch(() => {
            // Plugin not installed — not an error, just skip
            logger.debug('SplashScreen plugin not installed');
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- router excluded (Next.js 16 transition bug)
    }, [isNative, isAuthenticated]);

    // SSR / initial hydration render: isNative is null, show children (matches server HTML)
    // useLayoutEffect then fires synchronously BEFORE paint → sets isNative
    // React re-renders BEFORE paint → if native + unauthenticated, children are suppressed
    if (isNative === null) {
        return <>{children}</>;
    }

    if (isNative && !isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

