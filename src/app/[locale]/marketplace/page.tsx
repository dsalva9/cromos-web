import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { MarketplaceContent } from '@/components/marketplace/MarketplaceContent';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getTranslations, setRequestLocale } from 'next-intl/server';

// Revalidate every 30 seconds - enables ISR caching for faster page loads
// See: /docs/isr-page-caching.md for details
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketplace.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteConfig.url}/marketplace`,
    },
  };
}

export default async function MarketplacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch initial data on the server
  // This handles geolocation server-side if user is logged in
  // eliminating the client-side profile fetch waterfall
  const { listings, userPostcode } = await getMarketplaceData({
    limit: 20,
    search: '',
  });

  return (
    <MarketplaceContent
      initialListings={listings}
      initialUserPostcode={userPostcode}
    />
  );
}
