'use client';

import { useUser } from '@/components/providers/SupabaseProvider';
import LandingPage from '@/components/home/LandingPage';
import UserDashboard from '@/components/dashboard/UserDashboard';
// SiteFooter removed as it is in layout
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [splashHidden, setSplashHidden] = useState(false);

  // Check if running on native platform
  useEffect(() => {
    const checkNative = async () => {
      const { Capacitor } = await import('@capacitor/core');
      setIsNative(Capacitor.isNativePlatform());
    };
    checkNative();
  }, []);

  // Handle password recovery redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Preserve the hash when redirecting so Supabase can process the tokens
      router.push(`/profile/reset-password${hash}`);
    }
  }, [router]);

  // Handle native platform routing and splash screen
  useEffect(() => {
    const handleNativeApp = async () => {
      if (isNative !== true || loading) return;

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');

        // Route based on authentication status
        if (user) {
          // Redirect to marketplace if logged in
          router.replace('/marketplace');
        } else {
          // Redirect to login if not logged in
          router.replace('/login');
        }

        // Hide splash screen after a short delay to ensure navigation has started
        setTimeout(async () => {
          await SplashScreen.hide();
          setSplashHidden(true);
        }, 500);
      } catch (e) {
        console.error('Error in native app handling:', e);
      }
    };

    handleNativeApp();
  }, [isNative, user, loading, router]);

  // Authenticated redirect logic for web
  useEffect(() => {
    if (!loading && user && isNative === false) {
      router.push('/marketplace');
    }
  }, [user, loading, router, isNative]);

  // Show white screen while checking if native platform
  if (isNative === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Checking platform */}
      </div>
    );
  }

  // For native apps, show white screen while redirecting
  if (isNative === true) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Empty - will redirect to login or marketplace */}
      </div>
    );
  }

  // For web: show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl font-bold">Cargando...</div>
      </div>
    );
  }

  // If user is authenticated on web, render Dashboard
  if (user) {
    return <UserDashboard />;
  }

  // Not authenticated on web -> Landing Page
  return <LandingPage />;
}
