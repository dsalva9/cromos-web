'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Share } from 'lucide-react';
import { isWeb, isNative, isPWA } from '@/lib/platform';

const DISMISS_KEY = 'install-banner-dismissed';
const DISMISS_DAYS = 7;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cambiocromos.app';

/**
 * Compact install banner for mobile web users.
 * Shows below the Marketplace heading to encourage app installation.
 * - Android: links to Google Play Store
 * - iOS: shows PWA "Add to Home Screen" instructions
 * Hidden for: PWA standalone, Capacitor native, and recently dismissed users.
 */
export function InstallAppBanner() {
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        // Only show on mobile web browsers (not PWA, not native)
        if (isNative() || isPWA()) return;
        if (!isWeb()) return;

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissDate = new Date(dismissedAt);
            const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        // Only show on mobile-sized screens
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;

        // Detect platform
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const android = /Android/i.test(navigator.userAgent);

        setIsIOS(ios);
        setIsAndroid(android);
        setVisible(true);
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    }, []);

    if (!visible) return null;

    return (
        <div className="flex items-center gap-3 bg-gradient-to-r from-gold/10 to-yellow-50 dark:from-gold/5 dark:to-gray-800 border border-gold/30 dark:border-gold/20 rounded-lg px-3 py-2.5 mt-2 mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
            {isAndroid ? (
                /* ── Android: Google Play link ── */
                <>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-lg px-4 py-2 transition-colors shrink-0"
                    >
                        {/* Google Play icon — matches landing page */}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                        </svg>
                        <span className="text-xs font-semibold">Google Play</span>
                    </a>
                    <p className="flex-1 text-xs text-gray-600 dark:text-gray-300 leading-tight">
                        Descarga la app nativa
                    </p>
                </>
            ) : isIOS ? (
                /* ── iOS: PWA install instructions ── */
                <>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black shrink-0">
                        {/* Apple icon — matches landing page */}
                        <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                        </svg>
                    </div>
                    <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-tight">
                        Pulsa <Share className="w-3 h-3 inline -mt-0.5 text-blue-500" /> y{' '}
                        <span className="font-semibold">&quot;Añadir a inicio&quot;</span>
                    </p>
                </>
            ) : null}

            <button
                onClick={handleDismiss}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Cerrar"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
