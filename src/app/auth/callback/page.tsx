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
        // Check for next parameter in URL (search or hash)
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const next = searchParams.get('next') || hashParams.get('next');
        const code = searchParams.get('code') || hashParams.get('code');

        // Fragments often contain the tokens directly on some mobile redirects
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

        logger.info('Auth callback details', {
          url: window.location.href,
          hasCode: !!code,
          hasAccessToken: !!accessToken,
          next
        });

        // 1. Handle explicit code exchange (PKCE)
        if (code) {
          logger.info('Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            logger.error('Error exchanging code for session:', exchangeError);
          } else {
            logger.info('Code exchanged successfully');
          }
        }

        // 2. Handle implicit tokens if present
        if (accessToken && refreshToken) {
          logger.info('Tokens found in URL, setting session manually...');
          const { data: setData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (setError) {
            logger.error('Error setting session from tokens:', setError);
          } else {
            logger.info('Session set successfully from tokens', { user: setData.session?.user?.id });
          }
        }

        // Check if this is a password recovery flow
        if (next === '/profile/reset-password') {
          sessionStorage.setItem('password_recovery_required', 'true');
          logger.info('Password recovery flag set');
        }

        // Get the current session to verify we are logged in
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        logger.info('Final session check', {
          hasSession: !!sessionData.session,
          userId: sessionData.session?.user?.id,
          error: sessionError?.message
        });

        if (sessionError) {
          logger.error('Error getting session:', sessionError);
          setError('Error al procesar autenticación');
          return;
        }

        const sessionUser = sessionData.session?.user;

        if (!sessionUser) {
          logger.error('No authenticated user found after processing callback');
          if (mounted) router.push('/login');
          return;
        }

        // Get user profile (with retry for transient failures)
        let profile = null;
        let profileError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await supabase
            .from('profiles')
            .select('suspended_at, deleted_at, nickname, postcode, avatar_url')
            .eq('id', sessionUser.id)
            .single();

          profileError = result.error;
          profile = result.data;

          if (!profileError) break;

          logger.warn(`Profile query attempt ${attempt + 1} failed:`, profileError);
          // Wait 500ms before retrying (skip wait on last attempt)
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (profileError) {
          logger.error('All profile query attempts failed:', profileError);
          // Redirect to home — let ProfileCompletionGuard handle it
          // instead of blindly redirecting to profile completion
          if (mounted) router.push('/');
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

