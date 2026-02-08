'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useUser } from '@/components/providers/SupabaseProvider';

const completionRoute = '/profile/completar';

/**
 * Number of consecutive stable "incomplete" checks required before redirecting.
 * This prevents redirects on transient isComplete=false readings during re-fetch.
 */
const STABLE_INCOMPLETE_THRESHOLD = 2;

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

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
  const getIsExemptRoute = () => {
    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);
    const isAuthFlow = pathname?.startsWith('/auth');
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isResetPassword = pathname === '/profile/reset-password';
    return isOnCompletionRoute || isAuthFlow || isAuthPage || isResetPassword;
  };

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) return;

    const isExemptRoute = getIsExemptRoute();
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    // Detect if user just navigated away from /profile/completar (i.e. just saved)
    const justLeftCompletionRoute =
      previousPathname === completionRoute && pathname !== completionRoute;

    console.log('[ProfileCompletionGuard] Running check:', {
      userId: user.id,
      pathname,
      isComplete,
      profile,
      loading,
      authLoading,
      isExemptRoute,
      hasWarned: hasWarnedRef.current,
      stableIncompleteCount: stableIncompleteCountRef.current,
      justLeftCompletionRoute,
    });

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
      console.log('[ProfileCompletionGuard] Skipping redirect: just left completion route');
      stableIncompleteCountRef.current = 0;
      return;
    }

    // Stabilization: require multiple consecutive incomplete checks before redirecting
    stableIncompleteCountRef.current += 1;
    console.log('[ProfileCompletionGuard] Stable incomplete count:', stableIncompleteCountRef.current);

    if (stableIncompleteCountRef.current >= STABLE_INCOMPLETE_THRESHOLD) {
      console.log('[ProfileCompletionGuard] Profile confirmed incomplete, redirecting');
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.info(
          'Necesitas completar tu perfil para empezar a cambiar cromos!'
        );
      }
      router.replace(completionRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isComplete, loading, pathname, profile, router, user]);

  // Public/unauthenticated users should see the app normally
  if (!user) {
    return <>{children}</>;
  }

  // CRITICAL FIX: Always render children during loading!
  // This allows loading.tsx skeletons to show immediately.
  // The useEffect above will handle redirects in the background.
  if (authLoading || loading) {
    return <>{children}</>;
  }

  // Only block rendering for CONFIRMED incomplete profiles on non-exempt routes
  // Also require the stabilization threshold to be met before blocking
  if (!isComplete) {
    const isExemptRoute = getIsExemptRoute();
    if (!isExemptRoute && stableIncompleteCountRef.current >= STABLE_INCOMPLETE_THRESHOLD) {
      // Profile is confirmed incomplete and not on exempt route - block until redirect completes
      return null;
    }
  }

  return <>{children}</>;
}
