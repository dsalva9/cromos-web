'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '@/components/providers/SupabaseProvider';
import { updateOneSignalPlayerId } from '@/lib/supabase/notification-preferences';
import { ONESIGNAL_CONFIG } from '@/lib/onesignal/config';
import { handleNotificationClick, parseNotificationData } from '@/lib/onesignal/deep-linking';
import { logger } from '@/lib/logger';

// Declare OneSignal types for window
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OneSignalDeferred?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: any;
  }
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      logger.info('[OneSignal] No user logged in, skipping initialization');
      return;
    }

    /**
     * Save player ID to Supabase database
     */
    const savePlayerIdToDatabase = async (playerId: string) => {
      try {
        await updateOneSignalPlayerId(playerId);
        logger.info('[OneSignal] Player ID saved to database:', playerId);
      } catch (error) {
        logger.error('[OneSignal] Failed to save player ID:', error);
      }
    };

    /**
     * Initialize OneSignal for native platforms (iOS/Android via Capacitor)
     */
    const initializeNative = () => {
      const initOneSignal = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const OneSignal = (window as any).plugins?.OneSignal;

        if (!OneSignal) {
          logger.error('[OneSignal] Plugin not found on window.plugins');
          return;
        }

        logger.info('[OneSignal] Native plugin found, initializing...');

        // Initialize OneSignal
        OneSignal.initialize(ONESIGNAL_CONFIG.appId);

        // Set external user ID (for targeting specific users)
        if (user) {
          OneSignal.login(user.id);
          logger.info('[OneSignal] User logged in:', user.id);
        }

        // Listen for subscription changes to get player ID
        OneSignal.User.PushSubscription.addEventListener('change', (event: { current: { id: string } }) => {
          const playerId = event.current.id;
          if (playerId) {
            logger.info('[OneSignal] Player ID received:', playerId);
            savePlayerIdToDatabase(playerId);
          }
        });

        // Listen for notification clicks
        OneSignal.Notifications.addEventListener('click', (event: { notification: { additionalData?: unknown } }) => {
          logger.info('[OneSignal] Notification clicked:', event);
          const data = parseNotificationData(event.notification.additionalData);
          if (data) {
            handleNotificationClick(data);
          }
        });

        // Request permission
        OneSignal.Notifications.requestPermission(true)
          .then((accepted: boolean) => {
            logger.info('[OneSignal] Permission granted:', accepted);
          })
          .catch((err: unknown) => {
            logger.error('[OneSignal] Permission request error:', err);
          });
      };

      // Wait for deviceready event
      if (document.readyState === 'complete') {
        setTimeout(initOneSignal, 100);
      } else {
        document.addEventListener('deviceready', initOneSignal, false);
      }
    };

    /**
     * Initialize OneSignal for web browsers
     */
    const initializeWeb = () => {
      // Load OneSignal SDK dynamically
      if (!window.OneSignalDeferred) {
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        document.head.appendChild(script);
      }

      // Initialize when SDK is ready
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: {
        init: (config: unknown) => Promise<void>;
        login: (userId: string) => Promise<void>;
        User: {
          PushSubscription: {
            id: string | null;
            addEventListener: (event: string, callback: (change: { current: { id: string } }) => void) => void;
          };
        };
        Notifications: {
          addEventListener: (event: string, callback: (event: { data?: unknown }) => void) => void;
        };
      }) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_CONFIG.appId,
            allowLocalhostAsSecureOrigin: true,
            autoResubscribe: ONESIGNAL_CONFIG.autoResubscribe,
            autoRegister: ONESIGNAL_CONFIG.autoRegister,
            serviceWorkerPath: ONESIGNAL_CONFIG.serviceWorkerPath,
            serviceWorkerUpdaterPath: ONESIGNAL_CONFIG.serviceWorkerUpdaterPath,
            promptOptions: ONESIGNAL_CONFIG.promptOptions,
          });

          logger.info('[OneSignal] Web SDK initialized');

          // Set external user ID
          if (user) {
            await OneSignal.login(user.id);
            logger.info('[OneSignal] User logged in:', user.id);
          }

          // Get current subscription ID
          const subscriptionId = OneSignal.User.PushSubscription.id;
          if (subscriptionId) {
            logger.info('[OneSignal] Current subscription ID:', subscriptionId);
            savePlayerIdToDatabase(subscriptionId);
          }

          // Listen for subscription changes
          OneSignal.User.PushSubscription.addEventListener('change', (event) => {
            const playerId = event.current.id;
            if (playerId) {
              logger.info('[OneSignal] Subscription changed:', playerId);
              savePlayerIdToDatabase(playerId);
            }
          });

          // Listen for notification clicks
          OneSignal.Notifications.addEventListener('click', (event) => {
            logger.info('[OneSignal] Notification clicked:', event);
            const data = parseNotificationData(event.data);
            if (data) {
              handleNotificationClick(data);
            }
          });
        } catch (error) {
          logger.error('[OneSignal] Web initialization error:', error);
        }
      });
    };

    const isNative = Capacitor.isNativePlatform();
    logger.info('[OneSignal] Initializing...', { isNative, userId: user.id });

    if (isNative) {
      // Mobile (Capacitor) initialization
      initializeNative();
    } else {
      // Web initialization
      initializeWeb();
    }
  }, [user]);

  return <>{children}</>;
}
