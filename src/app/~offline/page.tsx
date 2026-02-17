'use client';

import Image from 'next/image';

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="relative w-40 h-40 mb-6">
                <Image
                    src="/assets/LogoBlanco.png"
                    alt="CambioCromos"
                    fill
                    className="object-contain"
                />
            </div>
            <h1 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-3">
                Sin conexión
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-md text-lg">
                Parece que no tienes conexión a internet. Comprueba tu conexión e inténtalo de nuevo.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 bg-[#FFC000] hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
                Reintentar
            </button>
        </div>
    );
}
