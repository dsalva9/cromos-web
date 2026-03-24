import dynamic from 'next/dynamic';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import LandingPage from '@/components/home/LandingPage';
import NativeRedirectHandler from '@/components/native/NativeRedirectHandler';
import { siteConfig } from '@/config/site';

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: 'es',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteConfig.url}/explorar?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/assets/LogoBlanco.png`,
};

// Lazy-load UserDashboard — heavy client component only shown to authenticated users
const UserDashboard = dynamic(() => import('@/components/dashboard/UserDashboard'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 animate-pulse p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  ),
});

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session?.user;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <NativeRedirectHandler isAuthenticated={isAuthenticated}>
      {isAuthenticated ? (
        <UserDashboard />
      ) : (
        <LandingPage />
      )}
    </NativeRedirectHandler>
    </>
  );
}

