'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error('Error during auth callback:', sessionError);
        setError('Error al procesar autenticación');
        return;
      }

      // Check if user is suspended
      if (sessionData.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('id', sessionData.session.user.id)
          .single();

        if (profileError) {
          logger.error('Error checking user suspension status:', profileError);
        } else if (profile?.is_suspended) {
          // Sign out suspended user
          await supabase.auth.signOut();
          setError('Tu cuenta ha sido suspendida. Por favor, contacta al administrador.');
          return;
        }
      }

      // Redirect to home page after successful auth
      router.push('/');
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

