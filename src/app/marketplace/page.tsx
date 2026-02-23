import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { MarketplaceContent } from '@/components/marketplace/MarketplaceContent';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

// Revalidate every 30 seconds - enables ISR caching for faster page loads
// See: /docs/isr-page-caching.md for details
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Marketplace | Cambio Cromos',
  description: 'Compra, vende e intercambia cromos con la comunidad. Encuentra los cromos que te faltan y completa tus colecciones.',
  alternates: {
    canonical: `${siteConfig.url}/marketplace`,
  },
};

export default async function MarketplacePage() {
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
