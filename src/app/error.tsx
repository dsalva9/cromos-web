'use client';

import { useEffect } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { getSupportMailtoUrl } from '@/lib/utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ChunkLoadError happens after deployments when stale tabs reference old chunks.
    // Auto-reload once to pick up the new assets.
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to load chunk');

    if (isChunkError) {
      const key = 'chunk_error_reload';
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();

      // Only auto-reload if we haven't done so in the last 10 seconds (prevents loops)
      if (!lastReload || now - Number(lastReload) > 10_000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
        return;
      }
    }

    logger.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ModernCard className="max-w-md w-full">
        <ModernCardContent className="p-8 text-center space-y-6">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-500" />

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              ¡Algo salió mal!
            </h2>
            <p className="text-gray-600">
              Encontramos un error al cargar esta página.
            </p>
            <p className="text-gray-600 mt-4">
              Por favor contacta con{' '}
              <a
                href={getSupportMailtoUrl(error)}
                className="text-gold hover:text-yellow-400 underline"
              >
                soporte@cambiocromos.com
              </a>
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left">
              <summary className="text-sm text-gray-600 cursor-pointer">
                Detalles del error (solo en desarrollo)
              </summary>
              <pre className="mt-2 text-xs text-red-400 overflow-auto p-2 bg-black rounded">
                {error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <Button
              onClick={reset}
              className="flex-1 bg-gold text-black hover:bg-gold-light font-bold"
            >
              Intentar de Nuevo
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1 border-2 border-black"
            >
              Ir al Inicio
            </Button>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}
