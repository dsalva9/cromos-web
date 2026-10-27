'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import {
  CUSTOM_INTERSTITIAL_LAST_SECTION_KEY,
  isInterstitialExemptRoute,
} from '@/hooks/useCustomInterstitial';
import { safeStorage } from '@/lib/safeStorage';

/** Strip the locale prefix from a pathname. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)(?=\/|$)/, '') || '/';
}

/** Extract the top-level section from a path (e.g. '/marketplace/foo' → 'marketplace'). */
export function getRouteSection(path: string): string {
  const stripped = stripLocale(path);
  return stripped.split('/').filter(Boolean)[0] || 'home';
}

/**
 * Watches section changes across both SPA and hard navigations (via safeStorage)
 * and invokes `maybeShowInterstitial('nav')` when moving between sections.
 */
export function useRouteChangeInterstitial(
  maybeShowInterstitial: (trigger: 'nav' | 'loadMore') => Promise<boolean>
) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useUser();
  const { isComplete, loading: profileLoading, initialFetchDone } = useProfileCompletion();

  useEffect(() => {
    if (authLoading || !user || !initialFetchDone || profileLoading || !isComplete) {
      return;
    }
    if (isInterstitialExemptRoute(pathname)) {
      return;
    }

    const currentSection = getRouteSection(pathname || '/');
    const prevSection = safeStorage.getItem(CUSTOM_INTERSTITIAL_LAST_SECTION_KEY);

    safeStorage.setItem(CUSTOM_INTERSTITIAL_LAST_SECTION_KEY, currentSection);

    if (prevSection && prevSection !== currentSection) {
      void maybeShowInterstitial('nav');
    }
  }, [pathname, authLoading, user, initialFetchDone, profileLoading, isComplete, maybeShowInterstitial]);
}
