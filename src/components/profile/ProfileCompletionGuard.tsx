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
  const { isComplete, loading } = useProfileCompletion();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) return;

    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);

    if (!isComplete && !isOnCompletionRoute) {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.info(
          'Necesitas completar tu perfil para empezar a cambiar cromos!'
        );
      }
      router.replace(completionRoute);
    } else if (isComplete) {
      hasWarnedRef.current = false;
    }
  }, [authLoading, isComplete, loading, pathname, router, user]);

  if (!isComplete) {
    if (authLoading || loading) {
      return null;
    }

    const isOnCompletionRoute =
      pathname === completionRoute ||
      pathname?.startsWith(`${completionRoute}/`);

    if (isOnCompletionRoute) {
      return <>{children}</>;
    }

    return null;
  }

  return <>{children}</>;
}

