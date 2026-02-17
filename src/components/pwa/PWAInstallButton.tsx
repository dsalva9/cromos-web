'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Type for the BeforeInstallPromptEvent (not yet in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Button.
 * Only visible when the browser fires the `beforeinstallprompt` event,
 * meaning the app meets the PWA installability criteria.
 * Triggers the native browser install dialog when clicked.
 */
export default function PWAInstallButton() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
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
        if (!prompt) return;

        await prompt.prompt();
        const { outcome } = await prompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setInstallPrompt(null);
        promptRef.current = null;
    }, []);

    // Don't render if already installed or no install prompt available
    if (isInstalled || !installPrompt) return null;

    return (
        <Button
            onClick={handleInstallClick}
            size="lg"
            className="bg-white dark:bg-gray-800 text-black dark:text-white font-bold text-sm h-12 px-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none rounded-xl cursor-pointer gap-2"
        >
            <Download className="w-5 h-5" />
            Instalar App
        </Button>
    );
}
