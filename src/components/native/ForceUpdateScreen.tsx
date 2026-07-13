'use client';

import { useForceUpdate } from '@/hooks/useForceUpdate';
import { PLAY_STORE_URL } from '@/config/app-version';
import { Download } from 'lucide-react';

/**
 * Renders a full-screen blocking overlay when the installed native app
 * is below the minimum required version. The user cannot dismiss it —
 * the only action is to open the Play Store and update.
 *
 * Completely invisible on web and PWA (useForceUpdate returns 'ok' there).
 * During the async version check it renders nothing, so there is no flash.
 */
export function ForceUpdateScreen({ children }: { children: React.ReactNode }) {
    const updateState = useForceUpdate();

    if (updateState === 'required') {
        return (
            <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-8 text-center">
                {/* Logo / Icon */}
                <div className="w-24 h-24 rounded-3xl bg-gold flex items-center justify-center mb-8 shadow-xl">
                    <Download className="w-12 h-12 text-black" strokeWidth={2.5} />
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                    Actualización necesaria
                </h1>

                {/* Body */}
                <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-2 max-w-xs">
                    Esta versión de CambioCromos ya no está soportada.
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-10 max-w-xs">
                    Por favor actualiza la app para seguir disfrutando de la experiencia.
                </p>

                {/* CTA */}
                <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs bg-gold text-black font-bold text-base py-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Actualizar en Google Play
                </a>

                <p className="mt-6 text-xs text-gray-400 dark:text-gray-600">
                    CambioCromos · v1.6.3+
                </p>
            </div>
        );
    }

    // 'checking' or 'ok' — render children normally
    // During 'checking' the children render immediately (no spinner/delay visible to user)
    return <>{children}</>;
}
