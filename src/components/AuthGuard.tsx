'use client';

import { useEffect } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      // TODO: Remove window.location.href workaround when Next.js fixes transition state bug
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  // Show nothing while checking auth
  if (loading) {
    return null;
  }

  // Always render children — returning null unmounts the page tree and corrupts
  // the Next.js router's internal transition state (click blocking bug).
  // The useEffect above handles the redirect.
  return <>{children}</>;
}

