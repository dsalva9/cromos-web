'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NativeRedirectHandlerProps {
    isAuthenticated: boolean;
}

/**
 * Handles Capacitor/native-only side effects:
 * - Redirects unauthenticated native users to /login
 * - Hides the Capacitor splash screen after routing
 * - Handles password recovery hash redirects
 *
 * This component renders nothing and does not block SSR.
 */
export default function NativeRedirectHandler({ isAuthenticated }: NativeRedirectHandlerProps) {
    const router = useRouter();

    // Handle password recovery redirect (works on both web and native)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            router.push(`/profile/reset-password${hash}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount - router dependency causes infinite loops

    // Handle native platform routing and splash screen
    useEffect(() => {
        const handleNativeApp = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (!Capacitor.isNativePlatform()) return;

                if (!isAuthenticated) {
                    router.replace('/login');
                }

                // Hide splash screen after a short delay to ensure navigation has started
                const { SplashScreen } = await import('@capacitor/splash-screen');
                setTimeout(async () => {
                    await SplashScreen.hide();
                }, 500);
            } catch (e) {
                console.error('Error in native app handling:', e);
            }
        };

        handleNativeApp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount - router/isAuthenticated dependencies cause re-runs

    return null;
}
