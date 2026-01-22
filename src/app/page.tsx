'use client';

import { useUser } from '@/components/providers/SupabaseProvider';
import LandingPage from '@/components/home/LandingPage';
// SiteFooter removed as it is in layout
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  // Handle password recovery redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Preserve the hash when redirecting so Supabase can process the tokens
      router.push(`/profile/reset-password${hash}`);
    }
  }, [router]);

  // Authenticated redirect logic
  useEffect(() => {
    if (!loading && user) {
      router.push('/marketplace');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl font-bold">Cargando...</div>
      </div>
    );
  }

  // If user is authenticated, we show loading state while redirecting (or null)
  // But typically just showing the spinner or nothing is fine to avoid flash
  if (user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl font-bold">Redirigiendo...</div>
      </div>
    );
  }

  // Not authenticated -> Landing Page
  return <LandingPage />;
}
