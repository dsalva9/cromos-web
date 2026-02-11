/**
 * Type declarations for OneSignal Cordova/Capacitor plugin.
 * Used by OneSignalProvider.tsx for native (Capacitor) integration.
 */

interface OneSignalPushSubscription {
    id: string | null;
    getIdAsync: (callback: (id: string | null) => void) => void;
    addEventListener: (event: 'change', callback: (change: { current: { id: string } }) => void) => void;
}

interface OneSignalNotifications {
    addEventListener: (event: 'click', callback: (event: { notification: { additionalData?: unknown } }) => void) => void;
    requestPermission: (fallbackToSettings: boolean) => Promise<boolean>;
}

interface OneSignalUser {
    pushSubscription: OneSignalPushSubscription;
    PushSubscription: {
        id: string | null;
        addEventListener: (event: string, callback: (change: { current: { id: string } }) => void) => void;
    };
}

interface OneSignalPlugin {
    initialize: (appId: string) => void;
    login: (userId: string) => void;
    User: OneSignalUser;
    Notifications: OneSignalNotifications;
}

interface OneSignalWebSDK {
    init: (config: unknown) => Promise<void>;
    login: (userId: string) => Promise<void>;
    User: OneSignalUser;
    Notifications: {
        addEventListener: (event: string, callback: (event: { data?: unknown }) => void) => void;
    };
}

interface OneSignalPlugins {
    OneSignal?: OneSignalPlugin;
    [key: string]: unknown;
}

// Augment the global Window interface
interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalWebSDK) => Promise<void>>;
    plugins?: OneSignalPlugins;
}
