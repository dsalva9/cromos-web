'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

const completionRoute = '/profile/completar';

/**
 * Number of consecutive stable "incomplete" checks required before redirecting.
 * This prevents redirects on transient isComplete=false readings during re-fetch.
 */
const STABLE_INCOMPLETE_THRESHOLD = 2;

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

/**
 * ProfileCompletionGuard — redirect-only guard (no render blocking).
 *
 * IMPORTANT: This guard must ALWAYS render `{children}`.  Returning `null`
 * would unmount the entire page tree, destroying the Next.js client-side
 * router's internal transition state and causing all `<Link>` components
 * to silently stop navigating (the "click blocking bug").
 *
 * Instead, the guard relies solely on the `useEffect` below to call
 * `router.replace()` when the profile is confirmed incomplete.
 */
export function ProfileCompletionGuard({
  children,
}: ProfileCompletionGuardProps) {
  const { isComplete, loading, profile } = useProfileCompletion();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const hasWarnedRef = useRef(false);
  const previousCompleteRef = useRef<boolean | null>(null);
  /** Track consecutive stable incomplete readings to avoid transient redirects */
  const stableIncompleteCountRef = useRef(0);
  /** Track the previous pathname to detect navigation away from /profile/completar */
  const previousPathnameRef = useRef<string | null>(null);

  // Helper to check if on exempt route
  const getIsExemptRoute = useCallback(() => {
    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);
    const isAuthFlow = pathname?.startsWith('/auth');
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isResetPassword = pathname === '/profile/reset-password';
    return isOnCompletionRoute || isAuthFlow || isAuthPage || isResetPassword;
  }, [pathname]);

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) return;

    const isExemptRoute = getIsExemptRoute();
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    // Detect if user just navigated away from /profile/completar (i.e. just saved)
    const justLeftCompletionRoute =
      previousPathname === completionRoute && pathname !== completionRoute;

    // Track state transitions to reset warning flag and stabilization counter
    if (previousCompleteRef.current === false && isComplete === true) {
      hasWarnedRef.current = false;
      stableIncompleteCountRef.current = 0;
    }
    previousCompleteRef.current = isComplete;

    // Reset stabilization counter when profile is complete
    if (isComplete) {
      stableIncompleteCountRef.current = 0;
      return;
    }

    // Don't redirect if on an exempt route
    if (isExemptRoute) {
      stableIncompleteCountRef.current = 0;
      return;
    }

    // Don't redirect if user just navigated away from completion page
    // (they just saved — give the provider a moment to settle)
    if (justLeftCompletionRoute) {
      logger.info('[ProfileCompletionGuard] Skipping redirect: just left completion route');
      stableIncompleteCountRef.current = 0;
      return;
    }

    // Stabilization: require multiple consecutive incomplete checks before redirecting
    stableIncompleteCountRef.current += 1;

    if (stableIncompleteCountRef.current >= STABLE_INCOMPLETE_THRESHOLD) {
      logger.info('[ProfileCompletionGuard] Profile confirmed incomplete, redirecting');
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.info(
          'Necesitas completar tu perfil para empezar a cambiar cromos!'
        );
      }
      router.replace(completionRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [authLoading, getIsExemptRoute, isComplete, loading, pathname, profile, user]); // router removed - causes infinite loops

  // Always render children — the useEffect above handles redirects.
  // Never return null here: unmounting the children tree corrupts the
  // Next.js router's internal transition state (click blocking bug).
  return <>{children}</>;
}
