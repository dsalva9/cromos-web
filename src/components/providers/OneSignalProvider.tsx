'use client';

import { useEffect } from 'react';
// import OneSignal from 'onesignal-cordova-plugin'; // Removed static import
import { Capacitor } from '@capacitor/core';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('OneSignalProvider mounted');
    if (Capacitor.isNativePlatform()) {
      console.log('OneSignal: Native platform detected, loading plugin...');
      // Dynamic import to avoid build issues with SSR/Next.js
      import('onesignal-cordova-plugin').then((OneSignalModule) => {
        // Handle both default export and named export scenarios
        const OneSignal = OneSignalModule.default || OneSignalModule;
        
        const ONESIGNAL_APP_ID = '3b9eb764-f440-404d-949a-1468356afc18';

        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Request permission
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
          console.log('User accepted notifications: ' + accepted);
        });
      }).catch(err => {
        console.error('Failed to load OneSignal plugin:', err);
      });
    } else {
      console.log('OneSignal skipped: Not native platform');
    }
  }, []);

  return <>{children}</>;
}
