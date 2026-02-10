'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Hard redirect — router.push gets stuck due to Next.js 16 transition bug
      window.location.href = redirectTo;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, redirectTo]); // router removed - causes cascading pushes (click blocking bug)

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Always render children — returning null unmounts the page tree and corrupts
  // the Next.js router's internal transition state (click blocking bug).
  // The useEffect above handles the redirect.
  return <>{children}</>;
}

