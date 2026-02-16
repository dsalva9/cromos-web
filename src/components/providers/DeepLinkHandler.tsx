'use client';

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useRouter } from '@/hooks/use-router';
import { logger } from '@/lib/logger';

export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

      // Navigate to the path
      router.push(path);
    }).then(handle => {
      listenerHandle = handle;
    });

    // Cleanup listener on unmount
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once - router dependency causes infinite loops

  return <>{children}</>;
}
