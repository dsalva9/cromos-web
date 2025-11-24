'use client';

import { useEffect } from 'react';
// import OneSignal from 'onesignal-cordova-plugin'; // Removed static import
import { Capacitor } from '@capacitor/core';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Dynamic import to avoid build issues with SSR/Next.js
      import('onesignal-cordova-plugin').then((OneSignalModule) => {
        // Handle both default export and named export scenarios
        const OneSignal = OneSignalModule.default || OneSignalModule;
        
        // TODO: Replace with actual OneSignal App ID from User
        const ONESIGNAL_APP_ID = '3b9eb764-f440-404d-949a-1468356afc18';

        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Request permission
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
          console.log('User accepted notifications: ' + accepted);
        });
      }).catch(err => {
        console.error('Failed to load OneSignal plugin:', err);
      });
    }
  }, []);

  return <>{children}</>;
}
