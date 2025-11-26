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
      console.log('[OneSignal] Native platform detected, loading plugin...');
      // Dynamic import to avoid build issues with SSR/Next.js
      import('onesignal-cordova-plugin').then((OneSignalModule) => {
        console.log('[OneSignal] Plugin loaded successfully');
        // Use namespace import and cast to any to bypass TypeScript errors
        const OneSignal = OneSignalModule as any;
        console.log('[OneSignal] OneSignal object:', typeof OneSignal);
        
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
      }).catch(err => {
        console.error('[OneSignal] Failed to load OneSignal plugin:', err);
      });
    } else {
      console.log('[OneSignal] Skipped: Not native platform');
    }
  }, []);

  return <>{children}</>;
}
