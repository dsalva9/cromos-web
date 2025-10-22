'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      {_error?.digest && (
        <span className="sr-only">{_error.digest}</span>
      )}
      <h2 className="text-2xl font-bold mb-4">Algo saliA3 mal</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Lo sentimos, ocurriA3 un error al cargar las plantillas. Intenta de nuevo.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
