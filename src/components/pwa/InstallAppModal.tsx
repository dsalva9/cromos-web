'use client';

import { useEffect, useState } from 'react';
import { X, Share, Zap, Bell, Smartphone } from 'lucide-react';
import { isWeb } from '@/lib/platform';
import Image from 'next/image';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cambiocromos.app';

interface InstallAppModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Post-onboarding modal inviting new users to install the app.
 * Uses the SAME button design as the landing page "Disponible en:" section.
 * - Android: Google Play button (black, Play icon)
 * - iOS: Apple PWA button (black, Apple icon) + share instructions
 */
export function InstallAppModal({ open, onClose }: InstallAppModalProps) {
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        if (!open) return;
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const android = /Android/i.test(navigator.userAgent);
        setIsIOS(ios);
        setIsAndroid(android);
    }, [open]);

    if (!open) return null;

    if (typeof window !== 'undefined' && !isWeb()) {
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

                {/* Label + Store button — same as landing page */}
                <div className="px-6 pb-6 pt-2 flex flex-col items-center gap-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Disponible en:
                    </p>

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
                        <>
                            <button
                                onClick={() => {/* iOS has no programmatic install */}}
                                className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors cursor-pointer"
                            >
                                {/* Apple icon — exact same as landing page PWAInstallButton */}
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                                </svg>
                                <span className="text-sm font-semibold">Instalar App</span>
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Pulsa <Share className="w-3 h-3 inline -mt-0.5 text-blue-500" /> en Safari y selecciona <span className="font-semibold">&quot;Añadir a pantalla de inicio&quot;</span>
                            </p>
                        </>
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
