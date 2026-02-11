'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <ModernCard className="max-w-md w-full">
            <ModernCardContent className="p-8 text-center space-y-6">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-500" />

              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  Error Crítico
                </h2>
                <p className="text-gray-600">
                  Ocurrió un error crítico. Por favor, recarga la página.
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

              <Button
                onClick={reset}
                className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
              >
                Recargar Página
              </Button>
            </ModernCardContent>
          </ModernCard>
        </div>
      </body>
    </html>
  );
}
