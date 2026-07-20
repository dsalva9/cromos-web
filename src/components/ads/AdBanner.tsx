'use client';

import { useAdMob } from '@/hooks/useAdMob';

/** Pages where the ad banner should be hidden */
export const AD_BANNER_HIDDEN_PATHS = ['/login', '/register', '/advertise', '/admin'];

/**
 * Height of the ad banner content (without safe-area).
 * Exported so other components can reference it for offset calculations.
 * Web ads have been removed — only AdMob runs on native Android.
 */
export const AD_BANNER_HEIGHT = 0; // px — no web ads

export function AdBanner() {
  // Initialise Google AdMob SDK and show native banner on Android.
  // On web/PWA this is a no-op — no web ads are served.
  useAdMob();

  // No web ads — the component renders nothing.
  // On native Android, AdMob renders a native overlay independently.
  return null;
}
