'use client';

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { logger } from '@/lib/logger';

export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | undefined;

    // Handle deep links when app is opened from a link
    if (!Capacitor.isPluginAvailable('App')) {
      logger.debug('App plugin not available, skipping deep link listener');
      return;
    }

    CapacitorApp.addListener('appUrlOpen', (data) => {
      logger.debug('Deep link received:', data.url);

      // Extract the path from the URL
      // Support both HTTPS and custom schemes (com.cambiocromos.app://auth/callback)
      const url = new URL(data.url);
      let path = url.pathname + url.search + url.hash;

      // Handle custom scheme where hostname might be part of the path logically
      // Example: com.cambiocromos.app://auth/callback -> pathname='/callback', host='auth'
      if (url.protocol === 'com.cambiocromos.app:' && url.host) {
        path = '/' + url.host + url.pathname + url.search + url.hash;
      }

      logger.debug('Navigating to:', path);

      // Use window.location.href instead of router.push to avoid the custom
      // use-router hook prepending the current locale prefix to the path.
      // Deep links like /auth/callback live OUTSIDE the /[locale]/ segment,
      // so adding /es/ would result in /es/auth/callback → 404.
      window.location.href = path;
    }).then(handle => {
      listenerHandle = handle;
    });

    // Cleanup listener on unmount
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return <>{children}</>;
}
