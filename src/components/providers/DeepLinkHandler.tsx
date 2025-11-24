'use client';

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | undefined;

    // Handle deep links when app is opened from a link
    CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('Deep link received:', data.url);
      
      // Extract the path from the URL
      // Example: https://cromos-web.vercel.app/marketplace/77 -> /marketplace/77
      const url = new URL(data.url);
      const path = url.pathname + url.search + url.hash;
      
      console.log('Navigating to:', path);
      
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
  }, [router]);

  return <>{children}</>;
}
