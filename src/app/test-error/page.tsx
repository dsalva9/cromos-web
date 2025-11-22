'use client';

import { useEffect } from 'react';

export default function TestErrorPage() {
  useEffect(() => {
    throw new Error('Test error boundary verification');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl">Si ves esto, el Error Boundary falló</h1>
    </div>
  );
}
