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

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session?.user;

  // Authenticated web users are redirected by middleware to /marketplace.
  // NativeRedirectHandler covers Capacitor/PWA edge cases.
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
        <LandingPage />
      </NativeRedirectHandler>
    </>
  );
}

