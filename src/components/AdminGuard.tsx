'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

interface AdminGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AdminGuard({
  children,
  redirectTo = '/',
}: AdminGuardProps) {
  const { user, loading: authLoading } = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (authLoading) return;

      if (!user) {
        logger.warn('AdminGuard: No user found, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        // Check if user has is_admin flag in profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('AdminGuard: Error checking admin status', { error });
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (!data?.is_admin) {
          logger.warn('AdminGuard: User is not an admin', { userId: user.id });
          setIsAdmin(false);
        } else {
          logger.info('AdminGuard: Admin access granted', { userId: user.id });
          setIsAdmin(true);
        }
      } catch (err) {
        logger.error('AdminGuard: Unexpected error', { error: err });
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, authLoading, router, supabase]);

  // Show loading while checking auth or admin status
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#FFC000] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-white font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#2D3748] border-4 border-black rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-[#E84D4D]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-300 mb-6">
            Solo los administradores pueden acceder a esta área.
          </p>
          <button
            onClick={() => router.push(redirectTo)}
            className="w-full bg-[#FFC000] hover:bg-[#FFD700] text-black font-bold py-3 px-6 rounded-lg border-4 border-black transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and is admin, render children
  return <>{children}</>;
}
