'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { isAdBannerHidden } from '@/components/ads/AdBanner';
import { fetchInterstitialAffiliate } from '@/lib/marketplace/interstitialAffiliate';
import { safeStorage } from '@/lib/safeStorage';
import type { AffiliateLink } from '@/types/affiliates';

export const CUSTOM_INTERSTITIAL_PENDING_KEY = 'custom_interstitial_pending';
export const CUSTOM_INTERSTITIAL_LAST_ACTIVITY_KEY = 'custom_interstitial_last_activity';
export const CUSTOM_INTERSTITIAL_LAST_SECTION_KEY = 'custom_interstitial_last_section';

const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Helper to check if the current route is exempt from showing any interstitial.
 */
export function isInterstitialExemptRoute(pathname?: string | null): boolean {
  if (!pathname) return true;
  if (isAdBannerHidden(pathname)) return true;
  const clean = pathname.replace(/^\/(es|en|pt)(?=\/|$)/, '') || '/';
  if (clean.startsWith('/auth')) return true;
  return false;
}

export function useCustomInterstitial(isAdFree: boolean) {
  const { user, loading: authLoading } = useUser();
  const { isComplete, loading: profileLoading, initialFetchDone } = useProfileCompletion();
  const pathname = usePathname();

  const [affiliate, setAffiliate] = useState<AffiliateLink | null>(null);
  const [affiliateLoaded, setAffiliateLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const resolveRef = useRef<((shown: boolean) => void) | null>(null);
  const affiliateRef = useRef<AffiliateLink | null>(null);
  affiliateRef.current = affiliate;

  // Clear session state on sign-out so next login always triggers fresh
  useEffect(() => {
    if (!authLoading && !user) {
      safeStorage.removeItem(CUSTOM_INTERSTITIAL_LAST_ACTIVITY_KEY);
      safeStorage.removeItem(CUSTOM_INTERSTITIAL_PENDING_KEY);
      safeStorage.removeItem(CUSTOM_INTERSTITIAL_LAST_SECTION_KEY);
      setIsVisible(false);
    }
  }, [authLoading, user]);

  // Fetch active interstitial affiliate when authenticated and not ad-free
  const loadAffiliate = useCallback(async (): Promise<AffiliateLink | null> => {
    if (isAdFree) {
      setAffiliate(null);
      setAffiliateLoaded(true);
      return null;
    }
    const data = await fetchInterstitialAffiliate();
    setAffiliate(data);
    affiliateRef.current = data;
    setAffiliateLoaded(true);
    return data;
  }, [isAdFree]);

  useEffect(() => {
    if (authLoading || !user || isAdFree) return;
    void loadAffiliate();
  }, [authLoading, user, isAdFree, loadAffiliate]);

  // Detect new session (>30 min inactivity) and update activity timestamp
  useEffect(() => {
    if (authLoading || !user || !initialFetchDone || profileLoading || !isComplete || isAdFree) {
      return;
    }

    const now = Date.now();
    const rawLastActivity = safeStorage.getItem(CUSTOM_INTERSTITIAL_LAST_ACTIVITY_KEY);
    const lastActivity = rawLastActivity ? parseInt(rawLastActivity, 10) : 0;

    if (!lastActivity || now - lastActivity > SESSION_INACTIVITY_MS) {
      safeStorage.setItem(CUSTOM_INTERSTITIAL_PENDING_KEY, 'true');
      safeStorage.setItem('interstitial_session_count', '0');
    }

    safeStorage.setItem(CUSTOM_INTERSTITIAL_LAST_ACTIVITY_KEY, String(now));
  }, [authLoading, user, initialFetchDone, profileLoading, isComplete, isAdFree, pathname]);

  // Consume `custom_interstitial_pending` when on a valid route with completed profile
  useEffect(() => {
    if (authLoading || !user || !initialFetchDone || profileLoading || !isComplete || isAdFree) {
      return;
    }
    if (isInterstitialExemptRoute(pathname)) {
      return;
    }
    if (!affiliateLoaded) {
      return;
    }

    const isPending = safeStorage.getItem(CUSTOM_INTERSTITIAL_PENDING_KEY) === 'true';
    if (!isPending) return;

    // Clear pending flag regardless of whether an active affiliate exists
    safeStorage.removeItem(CUSTOM_INTERSTITIAL_PENDING_KEY);

    if (!affiliate) return;

    const now = Date.now();
    safeStorage.setItem('interstitial_last_shown', String(now));
    const currentCount = parseInt(safeStorage.getItem('interstitial_session_count') || '0', 10);
    safeStorage.setItem('interstitial_session_count', String(currentCount + 1));
    setIsVisible(true);
  }, [
    authLoading,
    user,
    initialFetchDone,
    profileLoading,
    isComplete,
    isAdFree,
    pathname,
    affiliateLoaded,
    affiliate,
  ]);

  // Programmatic trigger for subsequent web interstitials (nav / loadMore)
  const showCustomInterstitial = useCallback(async (): Promise<boolean> => {
    if (isAdFree || !user || !isComplete || isInterstitialExemptRoute(pathname)) {
      return false;
    }

    let currentAffiliate = affiliateRef.current;
    if (!currentAffiliate) {
      currentAffiliate = await loadAffiliate();
    }
    if (!currentAffiliate) {
      return false;
    }

    const now = Date.now();
    safeStorage.setItem('interstitial_last_shown', String(now));
    const sc = parseInt(safeStorage.getItem('interstitial_session_count') || '0', 10);
    safeStorage.setItem('interstitial_session_count', String(sc + 1));

    setIsVisible(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, [isAdFree, user, isComplete, pathname, loadAffiliate]);

  const dismissCustomInterstitial = useCallback(() => {
    setIsVisible(false);
    const now = Date.now();
    safeStorage.setItem('interstitial_last_shown', String(now));
    safeStorage.setItem(CUSTOM_INTERSTITIAL_LAST_ACTIVITY_KEY, String(now));
    if (resolveRef.current) {
      const r = resolveRef.current;
      resolveRef.current = null;
      r(true);
    }
  }, []);

  return {
    affiliate,
    isVisible,
    showCustomInterstitial,
    dismissCustomInterstitial,
  };
}
