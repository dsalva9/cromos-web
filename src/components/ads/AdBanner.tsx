'use client';

import { useAdMob } from '@/hooks/useAdMob';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';

/** Pages where the ad banner should be hidden */
export const AD_BANNER_HIDDEN_PATHS = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/profile/reset-password',
  '/profile/completar',
  '/advertise',
  '/admin',
];

/**
 * Check if the ad banner should be hidden for the given pathname.
 * Handles locale prefixes (/es, /en, /pt) and subpaths.
 */
export function isAdBannerHidden(pathname?: string | null): boolean {
  if (!pathname) return false;
  const clean = pathname.replace(/^\/(es|en|pt)(?=\/|$)/, '') || '/';
  return AD_BANNER_HIDDEN_PATHS.some(p => clean === p || clean.startsWith(p + '/'));
}

/**
 * Height of the ad banner content (without safe-area).
 * Exported so other components can reference it for offset calculations.
 * Web ads have been removed — only AdMob runs on native Android.
 */
export const AD_BANNER_HEIGHT = 0; // px — no web ads

export function AdBanner() {
  const { profile, loading } = useProfileCompletion();
  const cachedPro = typeof window !== 'undefined' && localStorage.getItem('cc_is_pro') === 'true';
  const isPro = profile?.is_pro ?? cachedPro;

  // Initialise Google AdMob SDK and show native banner on Android.
  // On web/PWA this is a no-op — no web ads are served.
  // PRO users skip ad initialization entirely, and existing banner is destroyed.
  useAdMob(isPro, loading);

  // No web ads — the component renders nothing.
  // On native Android, AdMob renders a native overlay independently.
  return null;
}
