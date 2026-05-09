'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Share } from 'lucide-react';
import { isWeb, isNative, isPWA } from '@/lib/platform';

const DISMISS_KEY = 'install-banner-dismissed';
const DISMISS_DAYS = 7;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cambiocromos.app';

/**
 * Compact install banner for mobile web users.
 * Uses the SAME button design as the landing page "Disponible en:" section.
 * - Android: Google Play button (black, Play icon)
 * - iOS: Apple PWA button (black, Apple icon) with share tooltip
 */
export function InstallAppBanner() {
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [showTip, setShowTip] = useState(false);

    useEffect(() => {
        if (isNative() || isPWA()) return;
        if (!isWeb()) return;

        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissDate = new Date(dismissedAt);
            const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;

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

    const handleIOSClick = useCallback(() => {
        setShowTip(true);
        setTimeout(() => setShowTip(false), 4000);
    }, []);

    if (!visible) return null;

    return (
        <div className="flex flex-col items-center gap-2 bg-gradient-to-r from-gold/10 to-yellow-50 dark:from-gold/5 dark:to-gray-800 border border-gold/30 dark:border-gold/20 rounded-xl px-4 py-3 mt-2 mb-1 animate-in fade-in slide-in-from-top-2 duration-300 relative">
            {/* Dismiss button */}
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Cerrar"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Label — same as landing page */}
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide">
                📲 ¡Para una mejor experiencia, instala la app CambioCromos!
            </p>

            {/* Store buttons — same design as landing page */}
            <div className="flex flex-row items-center gap-3">
                {isAndroid && (
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors"
                    >
                        {/* Google Play icon — exact same as landing page */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#34A853"/>
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                        </svg>
                        <span className="text-sm font-semibold">Google Play</span>
                    </a>
                )}

                {isIOS && (
                    <div className="relative">
                        <button
                            onClick={handleIOSClick}
                            className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors cursor-pointer"
                        >
                            {/* Apple icon — exact same as landing page PWAInstallButton */}
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                            </svg>
                            <span className="text-sm font-semibold">Instalar App</span>
                        </button>
                        {showTip && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-4 py-2.5 w-56 text-center shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                Pulsa el botón Compartir <Share className="w-3 h-3 inline -mt-0.5" /> y selecciona &quot;Añadir a pantalla de inicio&quot;
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
