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
        logger.debug('[OneSignal] Calling updateOneSignalPlayerId with:', playerId);
        await updateOneSignalPlayerId(playerId);
        logger.debug('[OneSignal] ✅ Player ID saved to database:', playerId);
      } catch (error) {
        logger.error('[OneSignal] ❌ Failed to save player ID:', error);
      }
    };

    /**
     * Initialize OneSignal for native platforms (iOS/Android via Capacitor)
     */
    const initializeNative = () => {
      const initOneSignal = () => {
        logger.info('[OneSignal] Native initOneSignal called');
        logger.info('[OneSignal] Checking for plugins...', {
          hasWindow: typeof window !== 'undefined',
          hasPlugins: !!(window as any).plugins,
          pluginKeys: (window as any).plugins ? Object.keys((window as any).plugins) : [],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const OneSignal = (window as any).plugins?.OneSignal;

        if (!OneSignal) {
          logger.error('[OneSignal] Plugin not found on window.plugins');
          logger.error('[OneSignal] Available plugins:', (window as any).plugins);
          return;
        }

        logger.info('[OneSignal] Native plugin found, initializing...');
        logger.info('[OneSignal] OneSignal plugin methods:', Object.keys(OneSignal));

        try {
          // Initialize OneSignal
          logger.info('[OneSignal] Calling OneSignal.initialize with appId:', ONESIGNAL_CONFIG.appId);
          OneSignal.initialize(ONESIGNAL_CONFIG.appId);
          logger.info('[OneSignal] Initialize called successfully');
        } catch (error) {
          logger.error('[OneSignal] Error during initialize:', error);
          return;
        }

        // Set external user ID (for targeting specific users)
        if (user) {
          try {
            OneSignal.login(user.id);
            logger.info('[OneSignal] User logged in:', user.id);
          } catch (error) {
            logger.error('[OneSignal] Error logging in user:', error);
          }
        }

        // Get current subscription ID using Cordova plugin API
        try {
          logger.debug('[OneSignal] Getting push subscription ID...');
          OneSignal.User.pushSubscription.getIdAsync((id: string | null) => {
            logger.debug('[OneSignal] Got subscription ID:', id);
            if (id) {
              logger.debug('[OneSignal] Saving player ID to database:', id);
              savePlayerIdToDatabase(id);
            }
          });
        } catch (error) {
          logger.error('[OneSignal] Error getting subscription ID:', error);
        }

        // Listen for subscription changes using Cordova plugin API
        try {
          logger.info('[OneSignal] Adding subscription change listener...');
          OneSignal.User.pushSubscription.addEventListener('change', (event: { current: { id: string } }) => {
            logger.info('[OneSignal] Subscription changed:', event);
            const playerId = event.current?.id;
            if (playerId) {
              logger.info('[OneSignal] Player ID received:', playerId);
              savePlayerIdToDatabase(playerId);
            }
          });
        } catch (error) {
          logger.error('[OneSignal] Error adding subscription listener:', error);
        }

        // Listen for notification clicks using Cordova plugin API
        try {
          logger.info('[OneSignal] Adding notification click listener...');
          OneSignal.Notifications.addEventListener('click', (event: { notification: { additionalData?: unknown } }) => {
            logger.info('[OneSignal] Notification clicked:', event);
            const data = parseNotificationData(event.notification?.additionalData);
            if (data) {
              handleNotificationClick(data);
            }
          });
        } catch (error) {
          logger.error('[OneSignal] Error adding click listener:', error);
        }

        // Request permission
        try {
          logger.info('[OneSignal] Requesting notification permission...');
          OneSignal.Notifications.requestPermission(true)
            .then((accepted: boolean) => {
              logger.info('[OneSignal] Permission granted:', accepted);
              if (!accepted) {
                logger.warn('[OneSignal] User denied notification permission');
              }
            })
            .catch((err: unknown) => {
              logger.error('[OneSignal] Permission request error:', err);
            });
        } catch (error) {
          logger.error('[OneSignal] Error requesting permission:', error);
        }
      };

      // Wait for deviceready event
      logger.info('[OneSignal] Setting up deviceready listener, readyState:', document.readyState);

      const onDeviceReady = () => {
        logger.info('[OneSignal] deviceready event fired!');
        initOneSignal();
      };

      if (document.readyState === 'complete') {
        logger.info('[OneSignal] Document already complete, initializing after timeout');
        setTimeout(initOneSignal, 100);
      } else {
        logger.info('[OneSignal] Waiting for deviceready event');
        document.addEventListener('deviceready', onDeviceReady, false);

        // Also log when DOMContentLoaded fires
        document.addEventListener('DOMContentLoaded', () => {
          logger.info('[OneSignal] DOMContentLoaded fired');
        });
      }
    };

    /**
     * Initialize OneSignal for web browsers
     */
    const initializeWeb = () => {
      // Check if already initialized to prevent duplicate initialization
      if (window.OneSignalDeferred && Array.isArray(window.OneSignalDeferred) && window.OneSignalDeferred.length > 0) {
        logger.info('[OneSignal] Already initialized, skipping');
        return;
      }

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
    const platform = Capacitor.getPlatform();

    logger.info('[OneSignal] Initializing...', {
      isNative,
      platform,
      userId: user.id,
      capacitorVersion: Capacitor,
    });

    if (isNative) {
      // Mobile (Capacitor) initialization
      logger.info('[OneSignal] Starting NATIVE initialization for platform:', platform);
      initializeNative();
    } else {
      // Web initialization
      logger.info('[OneSignal] Starting WEB initialization');
      initializeWeb();
    }
  }, [user]);

  return <>{children}</>;
}
