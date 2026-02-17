import { Capacitor } from '@capacitor/core';

/**
 * Unified platform detection utilities.
 * Centralizes platform checks to avoid scattering Capacitor.isNativePlatform() calls.
 */

/** Returns true if running inside the Capacitor native shell (Android/iOS app) */
export function isNative(): boolean {
    return Capacitor.isNativePlatform();
}

/** Returns true if running as an installed PWA (standalone mode) but not native */
export function isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    if (isNative()) return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        // iOS Safari "Add to Home Screen" sets navigator.standalone
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

/** Returns true if running in a regular browser (not PWA, not native) */
export function isWeb(): boolean {
    if (typeof window === 'undefined') return true; // SSR fallback
    return !isNative() && !isPWA();
}

/** Returns true if the Vibration API is available */
export function supportsVibration(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'vibrate' in navigator;
}
