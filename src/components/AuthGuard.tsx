'use client';

import { useEffect } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useLocale } from 'next-intl';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { user, loading } = useUser();
  const locale = useLocale();

  useEffect(() => {
    if (!loading && !user) {
      // Prefix with locale for correct routing
      const localeRegex = /^\/(es|en|pt)(\/|$)/;
      const url = localeRegex.test(redirectTo) ? redirectTo : `/${locale}${redirectTo}`;
      window.location.href = url;
    }
  }, [user, loading, redirectTo, locale]);

  // Show nothing while checking auth
  if (loading) {
    return null;
  }

  // Always render children — returning null unmounts the page tree and corrupts
  // the Next.js router's internal transition state (click blocking bug).
  // The useEffect above handles the redirect.
  return <>{children}</>;
}

