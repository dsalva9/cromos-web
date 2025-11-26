'use client';

import { useEffect } from 'react';
// import OneSignal from 'onesignal-cordova-plugin'; // Removed static import
import { Capacitor } from '@capacitor/core';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[OneSignal] Provider mounted');
    console.log('[OneSignal] Capacitor available:', typeof Capacitor !== 'undefined');
    console.log('[OneSignal] isNativePlatform:', Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      console.log('[OneSignal] Native platform detected, initializing...');
      
      // Wait for deviceready event and access OneSignal via window.plugins
      const initOneSignal = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const OneSignal = (window as any).plugins?.OneSignal;
        
        if (!OneSignal) {
          console.error('[OneSignal] Plugin not found on window.plugins');
          return;
        }
        
        console.log('[OneSignal] Plugin found, initializing...');
        const ONESIGNAL_APP_ID = '3b9eb764-f440-404d-949a-1468356afc18';
        console.log('[OneSignal] Initializing with App ID:', ONESIGNAL_APP_ID);

        OneSignal.initialize(ONESIGNAL_APP_ID);
        console.log('[OneSignal] Initialize called');

        // Request permission
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
          console.log('[OneSignal] User accepted notifications:', accepted);
        }).catch((err: unknown) => {
          console.error('[OneSignal] Permission request error:', err);
        });
      };

      // Try immediately, or wait for deviceready
      if (document.readyState === 'complete') {
        setTimeout(initOneSignal, 100);
      } else {
        document.addEventListener('deviceready', initOneSignal, false);
      }
    } else {
      console.log('[OneSignal] Skipped: Not native platform');
    }
  }, []);

  return <>{children}</>;
}
