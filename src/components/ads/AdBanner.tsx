'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** Strip the locale prefix from a pathname. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

/** Pages where the ad banner should be hidden */
export const AD_BANNER_HIDDEN_PATHS = ['/login', '/register', '/advertise', '/admin'];

/**
 * Height of the ad banner content (without safe-area).
 * Exported so other components can reference it for offset calculations.
 * Mobile: 50px ad + padding. Desktop: 90px ad + padding.
 */
export const AD_BANNER_HEIGHT = 50; // px — mobile ad height

export function AdBanner() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);

  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  // Defer to client to avoid SSR hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // Inject mobile ad script
  useEffect(() => {
    if (!hasMounted) return;
    if (AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))) return;

    const container = mobileRef.current;
    if (!container) return;

    // Clear previous content to prevent duplication
    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `
      atOptions = {
        'key' : '207f77c777a93d9b339e6e77660a9707',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/207f77c777a93d9b339e6e77660a9707/invoke.js';

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, pathname]);

  // Inject desktop ad script
  useEffect(() => {
    if (!hasMounted) return;
    if (AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))) return;

    const container = desktopRef.current;
    if (!container) return;

    // Clear previous content to prevent duplication
    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `
      atOptions = {
        'key' : 'cda4bca11f2cef504a11b56506742be3',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/cda4bca11f2cef504a11b56506742be3/invoke.js';

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, pathname]);

  if (!hasMounted) return null;

  // Hide on specific pages
  if (AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))) {
    return null;
  }

  return (
    <>
      {/* ═══════ MOBILE BANNER (320×50, below bottom nav) ═══════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)] bg-white dark:bg-gray-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div
          ref={mobileRef}
          className="flex items-center justify-center"
          style={{ width: '100%', height: '50px', overflow: 'hidden' }}
        />
      </div>

      {/* ═══════ DESKTOP BANNER (728×90, sticky bottom strip) ═══════ */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)]">
        <div
          ref={desktopRef}
          className="flex items-center justify-center"
          style={{ width: '100%', height: '90px', overflow: 'hidden' }}
        />
      </div>
    </>
  );
}
