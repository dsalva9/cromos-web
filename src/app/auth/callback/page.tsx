'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

const PROFILE_COMPLETION_ROUTE = '/profile/completar';

function isProfileComplete(nickname: string | null, postcode: string | null) {
  const safeNickname = nickname?.trim() ?? '';
  const safePostcode = postcode?.trim() ?? '';

  if (!safeNickname || safeNickname.toLowerCase() === 'sin nombre') {
    return false;
  }

  if (!safePostcode) {
    return false;
  }

  return true;
}

export default function AuthCallback() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        logger.error('Error during auth callback:', sessionError);
        setError('Error al procesar autenticación');
        return;
      }

      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_suspended, nickname, postcode')
        .eq('id', sessionUser.id)
        .single();

      if (profileError) {
        logger.error('Error checking user suspension status:', profileError);
        router.push(PROFILE_COMPLETION_ROUTE);
        return;
      }

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        setError(
          'Tu cuenta ha sido suspendida. Por favor, contacta al administrador.'
        );
        return;
      }

      const complete = isProfileComplete(
        profile?.nickname ?? null,
        profile?.postcode ?? null
      );

      router.push(complete ? '/' : PROFILE_COMPLETION_ROUTE);
    };

    handleAuthCallback();
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

