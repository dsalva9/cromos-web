'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Check, Share, MoreVertical, PlusSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { track } from '@vercel/analytics/react';
import { createClient } from '@/lib/supabase/client';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
    const supabase = createClient();

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
            track('pwa_installed', { method: 'automatic' });
            supabase.from('analytics_events' as any).insert({ event_name: 'pwa_installed', metadata: { method: 'automatic' } });
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
                track('pwa_installed', { method: 'native_prompt' });
                supabase.from('analytics_events' as any).insert({ event_name: 'pwa_installed', metadata: { method: 'native_prompt' } });
            }
            setInstallPrompt(null);
            promptRef.current = null;
        } else {
            // No native prompt — show manual instructions modal
            setIsModalOpen(true);
            track('pwa_manual_prompt_viewed');
            supabase.from('analytics_events' as any).insert({ event_name: 'pwa_manual_prompt_viewed', metadata: { isIOS: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) } });
        }
    }, []);

    // Show "already installed" state
    if (isInstalled) {
        return (
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-[8px] px-4 h-[40px] text-xs font-medium">
                <Check className="w-4 h-4" />
                Ya instalada
            </div>
        );
    }

    // Detect iOS for instruction text
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
        <>
            <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors cursor-pointer"
            >
                {/* Apple-style icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                <span className="text-sm font-semibold">Instalar App</span>
            </button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Instalar CambioCromos</DialogTitle>
                        <DialogDescription>
                            Instala nuestra app en tu dispositivo para un acceso rápido y una mejor experiencia.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col gap-4 py-4">
                        {isIOS ? (
                            <div className="space-y-4">
                                <p className="text-sm font-medium">Para instalar la app en tu iPhone o iPad:</p>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 shrink-0">
                                        <Share className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <p>1. Pulsa el botón <strong>Compartir</strong> en la barra inferior de Safari.</p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 shrink-0">
                                        <PlusSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                    </div>
                                    <p>2. Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm font-medium">Para instalar la app en tu dispositivo Android:</p>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 shrink-0">
                                        <MoreVertical className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                    </div>
                                    <p>1. Toca el menú de opciones (tres puntos) en la esquina superior derecha de Chrome.</p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 shrink-0">
                                        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                    </div>
                                    <p>2. Selecciona <strong>"Instalar aplicación"</strong> o "Añadir a pantalla de inicio".</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
