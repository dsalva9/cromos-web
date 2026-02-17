'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Type for the BeforeInstallPromptEvent (not yet in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Button.
 * Always visible on mobile. When the browser supports direct install
 * (beforeinstallprompt), triggers the native dialog. Otherwise shows
 * a brief tooltip with manual install instructions.
 */
export default function PWAInstallButton() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showTip, setShowTip] = useState(false);
    const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            promptRef.current = promptEvent;
            setInstallPrompt(promptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
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

    const handleInstallClick = useCallback(async () => {
        const prompt = promptRef.current;
        if (prompt) {
            // Native install prompt available
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setInstallPrompt(null);
            promptRef.current = null;
        } else {
            // No native prompt — show manual instructions tooltip
            setShowTip(true);
            setTimeout(() => setShowTip(false), 4000);
        }
    }, []);

    // Show "already installed" state
    if (isInstalled) {
        return (
            <Button
                disabled
                size="lg"
                className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm h-12 px-6 border-2 border-green-300 dark:border-green-700 rounded-xl gap-2 opacity-80 cursor-default"
            >
                <Check className="w-5 h-5" />
                Ya instalada
            </Button>
        );
    }

    // Detect iOS for instruction text
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
        <div className="relative">
            <Button
                onClick={handleInstallClick}
                size="lg"
                className="bg-white dark:bg-gray-800 text-black dark:text-white font-bold text-sm h-12 px-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none rounded-xl cursor-pointer gap-2"
            >
                <Download className="w-5 h-5" />
                Instalar App
            </Button>
            {showTip && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-4 py-2.5 w-56 text-center shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isIOS
                        ? 'Pulsa el botón Compartir ⬆ y selecciona "Añadir a pantalla de inicio"'
                        : 'Abre el menú ⋮ de Chrome y selecciona "Instalar aplicación"'
                    }
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />
                </div>
            )}
        </div>
    );
}
