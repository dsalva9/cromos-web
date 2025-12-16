'use client';

import { useUser } from '@/components/providers/SupabaseProvider';
import Hero from '@/components/home/Hero';
import HowItWorks from '@/components/home/HowItWorks';
import MarketplaceShowcase from '@/components/home/MarketplaceShowcase';
import FeatureHighlights from '@/components/home/FeatureHighlights';
import SiteFooter from '@/components/site-footer';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl font-bold">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937] flex flex-col">
      <main className="flex-1">
        <Hero isAuthenticated={!!user} />
        <HowItWorks />
        <MarketplaceShowcase />
        <FeatureHighlights />
      </main>

      <SiteFooter />
    </div>
  );
}
