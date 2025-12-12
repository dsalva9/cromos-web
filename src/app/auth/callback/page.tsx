'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

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
    // Check for next parameter in URL
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    const handleAuthCallback = async (event: AuthChangeEvent, session: Session | null) => {
      logger.info('Auth callback event:', event);

      // Wait for auth events that indicate successful authentication
      if (event !== 'SIGNED_IN' && event !== 'PASSWORD_RECOVERY') {
        return;
      }

      const sessionUser = session?.user;

      if (!sessionUser) {
        logger.error('No user in session after auth event');
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('suspended_at, deleted_at, nickname, postcode, avatar_url')
        .eq('id', sessionUser.id)
        .single();

      if (profileError) {
        logger.error('Error checking user suspension status:', profileError);
        router.push(PROFILE_COMPLETION_ROUTE);
        return;
      }

      if (profile?.suspended_at || profile?.deleted_at) {
        await supabase.auth.signOut();
        setError(
          'Tu cuenta ha sido suspendida. Por favor, contacta al administrador.'
        );
        return;
      }

      // If there's a next parameter, redirect there (for password reset, etc.)
      if (next) {
        router.push(next);
        return;
      }

      // Otherwise, check profile completion and redirect accordingly
      const complete = isProfileComplete(
        profile?.nickname ?? null,
        profile?.postcode ?? null,
        profile?.avatar_url ?? null
      );

      router.push(complete ? '/' : PROFILE_COMPLETION_ROUTE);
    };

    // Listen for auth state changes to handle code exchange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthCallback);

    return () => {
      subscription.unsubscribe();
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

