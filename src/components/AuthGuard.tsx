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
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Verificando autenticaciÃ³n...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

