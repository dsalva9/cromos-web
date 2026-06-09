'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { InstallAppModal } from './InstallAppModal';

function PWAInstallQueryHandlerContent() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('install') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    
    // Clean up the ?install=true parameter from the URL bar without reloading the page
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('install');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  };

  return <InstallAppModal open={isOpen} onClose={handleClose} />;
}

export default function PWAInstallQueryHandler() {
  return (
    <Suspense fallback={null}>
      <PWAInstallQueryHandlerContent />
    </Suspense>
  );
}
