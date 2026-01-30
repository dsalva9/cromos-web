'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CookieConsentBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show banner if no consent choice has been made
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Small delay to make it feel less intrusive on reload
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
        // Trigger custom event to notify GoogleAnalytics component
        window.dispatchEvent(new Event('cookie-consent-updated'));
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'rejected');
        setIsVisible(false);
        window.dispatchEvent(new Event('cookie-consent-updated'));
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50"
                >
                    <div className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,192,0,0.2)] p-6 rounded-lg">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-[#FFC000] rounded-full flex items-center justify-center border-2 border-black">
                                <Cookie className="w-5 h-5 text-black" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black uppercase text-gray-900 dark:text-white mb-2 flex justify-between items-center">
                                    Control de Cookies
                                    <button
                                        onClick={() => setIsVisible(false)}
                                        className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                    Utilizamos cookies para analizar el tráfico y mejorar tu experiencia. Al aceptar, nos ayudas a optimizar la plataforma. Consulta nuestra{' '}
                                    <Link href="/legal/cookies" className="text-[#FFC000] hover:underline font-bold">
                                        Política de Cookies
                                    </Link> para más detalles.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        onClick={handleAccept}
                                        className="bg-[#FFC000] hover:bg-yellow-400 text-black font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex-1"
                                    >
                                        Aceptar todas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDecline}
                                        className="bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-bold border-2 border-black dark:border-gray-700 transition-all flex-1"
                                    >
                                        Solo esenciales
                                    </Button>
                                </div>
                                <div className="mt-3 text-center">
                                    <Link
                                        href="/legal/cookies"
                                        className="text-xs text-gray-500 hover:text-[#FFC000] transition-colors underline underline-offset-2"
                                    >
                                        Personalizar preferencias
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
