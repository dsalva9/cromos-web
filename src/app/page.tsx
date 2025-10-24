'use client';

import { useUser } from '@/components/providers/SupabaseProvider';
import Hero from '@/components/home/Hero';
import HowItWorks from '@/components/home/HowItWorks';
import MarketplaceShowcase from '@/components/home/MarketplaceShowcase';
import FeatureHighlights from '@/components/home/FeatureHighlights';
import SiteFooter from '@/components/site-footer';

export default function Home() {
  const { user, loading } = useUser();

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
