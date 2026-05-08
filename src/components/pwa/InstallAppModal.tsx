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
 * Post-onboarding modal that invites new users to install the app.
 * - Android: links to Google Play Store (same design as landing page)
 * - iOS: shows PWA "Add to Home Screen" instructions
 * Only shown on mobile web browsers (not PWA or native).
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

    // Don't show on non-web platforms (auto-close and redirect)
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

                {/* Actions */}
                <div className="px-6 pb-6 pt-2 space-y-3">
                    {isAndroid ? (
                        /* ── Android: Google Play Store link ── */
                        <a
                            href={PLAY_STORE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl border-2 border-black shadow-md hover:shadow-lg transition-all"
                        >
                            {/* Google Play icon — matches landing page */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                                <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                                <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                                <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                            </svg>
                            <span className="text-sm font-semibold">Descargar en Google Play</span>
                        </a>
                    ) : isIOS ? (
                        /* ── iOS: PWA install instructions ── */
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                Pulsa <Share className="w-4 h-4 inline -mt-0.5 text-blue-500" />{' '}
                                en Safari y selecciona{' '}
                                <span className="font-bold">&quot;Añadir a pantalla de inicio&quot;</span>
                            </p>
                        </div>
                    ) : (
                        /* ── Desktop/other: generic PWA instruction ── */
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
