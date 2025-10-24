'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-[#1F2937] flex items-center justify-center p-4">
          <ModernCard className="max-w-md w-full">
            <ModernCardContent className="p-8 text-center space-y-6">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-500" />

              <div>
                <h2 className="text-2xl font-black text-white mb-2">
                  Error Crítico
                </h2>
                <p className="text-gray-400">
                  Ocurrió un error crítico. Por favor, recarga la página.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer">
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
