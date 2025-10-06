'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';

export default function AuthCallback() {
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error during auth callback:', error);
      }

      // Redirect to home page after successful auth
      router.push('/');
    };

    handleAuthCallback();
  }, [supabase, router]);

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <p>Processing authentication...</p>
    </div>
  );
}

