'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

const PROFILE_COMPLETION_ROUTE = '/profile/completar';

function isProfileComplete(
  nickname: string | null,
  postcode: string | null,
  avatarUrl: string | null
) {
  const safeNickname = nickname?.trim() ?? '';
  const safePostcode = postcode?.trim() ?? '';
  const safeAvatar = avatarUrl?.trim() ?? '';

  const nicknameLower = safeNickname.toLowerCase();
  const postcodeLower = safePostcode.toLowerCase();

  const hasPlaceholderNickname =
    nicknameLower === 'sin nombre' || nicknameLower.startsWith('pending_');
  const hasPlaceholderPostcode = postcodeLower === 'pending';

  if (!safeNickname || hasPlaceholderNickname) {
    return false;
  }

  if (!safePostcode || hasPlaceholderPostcode) {
    return false;
  }

  if (!safeAvatar) {
    return false;
  }

  return true;
}

export default function AuthCallback() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      try {
        // Check for next parameter in URL
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        const code = params.get('code');

        logger.info('Auth callback started', { hasCode: !!code, next });

        // If there's a code, exchange it for a session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            logger.error('Error exchanging code for session:', exchangeError);
            setError('Error al procesar autenticación');
            return;
          }

          logger.info('Code exchanged successfully', { userId: data.session?.user?.id });

          // Check if this is a password recovery flow
          // For password recovery, we check if the next param indicates reset password
          if (next === '/profile/reset-password') {
            // Set flag to require password reset
            sessionStorage.setItem('password_recovery_required', 'true');
            logger.info('Password recovery flag set');
          }
        }

        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Error getting session:', sessionError);
          setError('Error al procesar autenticación');
          return;
        }

        const sessionUser = sessionData.session?.user;

        if (!sessionUser) {
          logger.error('No user in session after code exchange');
          if (mounted) router.push('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('suspended_at, deleted_at, nickname, postcode, avatar_url')
          .eq('id', sessionUser.id)
          .single();

        if (profileError) {
          logger.error('Error checking user suspension status:', profileError);
          if (mounted) router.push(PROFILE_COMPLETION_ROUTE);
          return;
        }

        if (profile?.suspended_at || profile?.deleted_at) {
          await supabase.auth.signOut();
          if (mounted) {
            setError(
              'Tu cuenta ha sido suspendida. Por favor, contacta al administrador.'
            );
          }
          return;
        }

        // If there's a next parameter, redirect there (for password reset, etc.)
        if (next) {
          logger.info('Redirecting to next:', next);
          if (mounted) router.push(next);
          return;
        }

        // Otherwise, check profile completion and redirect accordingly
        const complete = isProfileComplete(
          profile?.nickname ?? null,
          profile?.postcode ?? null,
          profile?.avatar_url ?? null
        );

        logger.info('Redirecting based on profile completion:', { complete });
        if (mounted) router.push(complete ? '/' : PROFILE_COMPLETION_ROUTE);
      } catch (err) {
        logger.error('Unexpected error in auth callback:', err);
        if (mounted) setError('Error inesperado al procesar autenticación');
      }
    };

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-600 text-white px-6 py-4 rounded-md border-4 border-black max-w-md mx-auto">
          <h2 className="text-xl font-black mb-2">Acceso Denegado</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <p className="text-white">Procesando autenticación...</p>
    </div>
  );
}

