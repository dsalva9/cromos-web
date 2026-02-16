'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/hooks/use-router';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { isProfileComplete } from '@/lib/profile/isProfileComplete';

const PROFILE_COMPLETION_ROUTE = '/profile/completar';

export default function AuthCallback() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

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
        let hadPkceError = false;
        if (code) {
          logger.info('Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // PKCE verifier can be lost on mobile (in-app browser switches context)
            // or when cookies expire — downgrade to warn so it doesn't flood Sentry
            if (exchangeError.code === 'pkce_code_verifier_not_found') {
              logger.info('PKCE code verifier not found, will attempt session recovery', {
                code: exchangeError.code,
              });
              hadPkceError = true;
            } else {
              logger.error('Error exchanging code for session:', exchangeError);
            }
          } else {
            logger.info('Code exchanged successfully');
            // Clear the code from URL to prevent re-exchange on refresh
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('code');
              window.history.replaceState({}, '', url.toString());
            }
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
          // If PKCE verifier was lost (common on mobile), show a friendly retry message
          if (hadPkceError) {
            logger.info('Session recovery failed after PKCE error, redirecting to login');
            if (mounted) {
              setError('No se pudo completar el inicio de sesión. Por favor, inténtalo de nuevo.');
              // Auto-redirect to login after a short delay so the user sees the message
              setTimeout(() => { if (mounted) router.push('/login'); }, 3000);
            }
          } else {
            logger.warn('No authenticated user found after processing callback');
            if (mounted) {
              setError('El enlace ha expirado o ya fue utilizado. Por favor, inicia sesión de nuevo.');
              setTimeout(() => { if (mounted) router.push('/login'); }, 3000);
            }
          }
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

