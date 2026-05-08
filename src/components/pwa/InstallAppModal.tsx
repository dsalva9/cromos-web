'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Download, X, Share, Smartphone, Zap, Bell } from 'lucide-react';
import { isWeb } from '@/lib/platform';
import Image from 'next/image';

// Type for the BeforeInstallPromptEvent (not yet in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Post-onboarding modal that invites new users to install the app/PWA.
 * Only shown on mobile web browsers (not PWA or native).
 */
export function InstallAppModal({ open, onClose }: InstallAppModalProps) {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [installing, setInstalling] = useState(false);
    const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (!open) return;

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(ios);

        if (ios) return;

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            promptRef.current = promptEvent;
            setInstallPrompt(promptEvent);
        };

        const handleAppInstalled = () => {
            setInstalling(false);
            onClose();
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [open, onClose]);

    const handleInstall = useCallback(async () => {
        const prompt = promptRef.current;
        if (prompt) {
            setInstalling(true);
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                // appinstalled event will fire and close the modal
                return;
            }
            setInstalling(false);
            setInstallPrompt(null);
            promptRef.current = null;
        }
    }, []);

    if (!open) return null;

    // Don't show on non-web platforms
    if (typeof window !== 'undefined' && !isWeb()) {
        // Auto-close and redirect
        onClose();
        return null;
    }

    const benefits = [
        { icon: Zap, text: 'Acceso rápido desde tu pantalla' },
        { icon: Bell, text: 'Notificaciones de nuevos mensajes' },
        { icon: Smartphone, text: 'Experiencia nativa sin navegador' },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-300 border-2 border-black dark:border-gray-700">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header with app icon */}
                <div className="bg-gradient-to-br from-gold/20 via-yellow-50 to-white dark:from-gold/10 dark:via-gray-800 dark:to-gray-800 pt-8 pb-6 px-6 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-black">
                        <Image
                            src="/assets/LogoBlanco.png"
                            alt="CambioCromos"
                            fill
                            className="object-contain bg-gray-900 p-2"
                        />
                    </div>
                    <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-1">
                        ¡Instala CambioCromos!
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Lleva tus cromos siempre contigo
                    </p>
                </div>

                {/* Benefits */}
                <div className="px-6 py-4 space-y-3">
                    {benefits.map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 dark:bg-gold/5 shrink-0">
                                <Icon className="w-4 h-4 text-gold" />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-2 space-y-3">
                    {isIOS ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                Pulsa <Share className="w-4 h-4 inline -mt-0.5 text-blue-500" />{' '}
                                en Safari y selecciona{' '}
                                <span className="font-bold">&quot;Añadir a pantalla de inicio&quot;</span>
                            </p>
                        </div>
                    ) : installPrompt ? (
                        <button
                            onClick={handleInstall}
                            disabled={installing}
                            className="w-full bg-gold hover:bg-yellow-400 text-black font-black uppercase py-3 rounded-xl border-2 border-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            <Download className="w-5 h-5" />
                            {installing ? 'Instalando...' : 'Instalar App'}
                        </button>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Abre el menú <span className="font-bold">⋮</span> de Chrome y selecciona{' '}
                                <span className="font-bold">&quot;Instalar aplicación&quot;</span>
                            </p>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 transition-colors font-medium"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    );
}
