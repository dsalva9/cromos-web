'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useUser } from '@/components/providers/SupabaseProvider';

const completionRoute = '/profile/completar';

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

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) return;

    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);
    const isAuthFlow = pathname?.startsWith('/auth');
    const isExemptRoute = isOnCompletionRoute || isAuthFlow;

    console.log('[ProfileCompletionGuard] Running check:', {
      userId: user.id,
      pathname,
      isComplete,
      profile,
      loading,
      authLoading,
      isExemptRoute,
      hasWarned: hasWarnedRef.current,
    });

    // Track state transitions to reset warning flag
    if (previousCompleteRef.current === false && isComplete === true) {
      // User just completed their profile, reset warning flag
      hasWarnedRef.current = false;
    }
    previousCompleteRef.current = isComplete;

    if (!isComplete && !isExemptRoute) {
      console.log('[ProfileCompletionGuard] Profile incomplete, showing toast');
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.info(
          'Necesitas completar tu perfil para empezar a cambiar cromos!'
        );
      }
      router.replace(completionRoute);
    }
  }, [authLoading, isComplete, loading, pathname, profile, router, user]);

  // Public/unauthenticated users should see the app normally
  if (!user) {
    return <>{children}</>;
  }

  if (!isComplete) {
    if (authLoading || loading) {
      return null;
    }

    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);
    const isAuthFlow = pathname?.startsWith('/auth');
    const isExemptRoute = isOnCompletionRoute || isAuthFlow;

    if (isExemptRoute) {
      return <>{children}</>;
    }

    return null;
  }

  return <>{children}</>;
}

