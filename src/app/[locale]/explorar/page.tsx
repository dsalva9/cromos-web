import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { PublicMarketplaceContent } from '@/components/marketplace/PublicMarketplaceContent';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/config/site';

// Revalidate every 30 seconds - enables ISR caching for faster page loads
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'explorar' });
  return {
  title: t('meta.title'),
  description: t('meta.description'),
  alternates: {
    canonical: `${siteConfig.url}/explorar`,
  },
  openGraph: {
    title: t('meta.title'),
    description: t('meta.description'),
    url: `${siteConfig.url}/explorar`,
    siteName: siteConfig.name,
    type: 'website',
  },
};
}

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'explorar' });
  const { listings } = await getMarketplaceData({
    limit: 20,
    search: '',
  });

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('meta.jsonLdName'),
    description: t('meta.description'),
    url: `${siteConfig.url}/explorar`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <PublicMarketplaceContent
        initialListings={listings}
      />
    </>
  );
}
