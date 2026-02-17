'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { isPWA } from '@/lib/platform';

interface PWASplashScreenProps {
    children: ReactNode;
}

/**
 * Splash screen for PWA mode.
 * Shows the CambioCromos logo on a white background, then fades out
 * after the app has mounted — mimicking the Capacitor splash screen behavior.
 */
export default function PWASplashScreen({ children }: PWASplashScreenProps) {
    const [showSplash, setShowSplash] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const checkedRef = useRef(false);

    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;

        if (isPWA()) {
            setShowSplash(true);
            // Start fade-out after a short delay to let the app render underneath
            const timer = setTimeout(() => {
                setFadeOut(true);
                // Remove splash from DOM after animation completes
                setTimeout(() => setShowSplash(false), 500);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <>
            {showSplash && (
                <div
                    className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
                    style={{ paddingTop: 'env(safe-area-inset-top)' }}
                >
                    <div className="relative w-48 h-48">
                        <Image
                            src="/assets/LogoBlanco.png"
                            alt="CambioCromos"
                            fill
                            priority
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
            {children}
        </>
    );
}
