import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { MarketplaceContent } from '@/components/marketplace/MarketplaceContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace | Cambio Cromos',
  description: 'Compra, vende e intercambia cromos con la comunidad. Encuentra los cromos que te faltan y completa tus colecciones.',
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
