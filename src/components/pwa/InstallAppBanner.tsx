'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';
import { isWeb } from '@/lib/platform';

// Type for the BeforeInstallPromptEvent (not yet in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'install-banner-dismissed';
const DISMISS_DAYS = 7;

/**
 * Compact install banner for mobile web users.
 * Shows below the Marketplace heading to encourage PWA/app installation.
 * Hidden for: PWA standalone, Capacitor native, and recently dismissed users.
 */
export function InstallAppBanner() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Only show on mobile web browsers
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

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(ios);

        // iOS doesn't fire beforeinstallprompt, show banner immediately
        if (ios) {
            setVisible(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            promptRef.current = promptEvent;
            setInstallPrompt(promptEvent);
            setVisible(true);
        };

        const handleAppInstalled = () => {
            setVisible(false);
            setInstallPrompt(null);
            promptRef.current = null;
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        const prompt = promptRef.current;
        if (prompt) {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                setVisible(false);
            }
            setInstallPrompt(null);
            promptRef.current = null;
        }
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    }, []);

    if (!visible) return null;

    return (
        <div className="flex items-center gap-3 bg-gradient-to-r from-gold/10 to-yellow-50 dark:from-gold/5 dark:to-gray-800 border border-gold/30 dark:border-gold/20 rounded-lg px-3 py-2.5 mt-2 mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/20 dark:bg-gold/10 shrink-0">
                <Download className="w-4 h-4 text-gold" />
            </div>

            <div className="flex-1 min-w-0">
                {isIOS ? (
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-tight">
                        Pulsa <Share className="w-3 h-3 inline -mt-0.5 text-blue-500" /> y{' '}
                        <span className="font-semibold">Añadir a inicio</span>
                    </p>
                ) : (
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-tight">
                        Instala la app para una{' '}
                        <span className="font-semibold">mejor experiencia</span>
                    </p>
                )}
            </div>

            {!isIOS && installPrompt && (
                <button
                    onClick={handleInstall}
                    className="shrink-0 bg-gold hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-md transition-colors"
                >
                    Instalar
                </button>
            )}

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
