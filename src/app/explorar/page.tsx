import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { PublicMarketplaceContent } from '@/components/marketplace/PublicMarketplaceContent';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

// Revalidate every 30 seconds - enables ISR caching for faster page loads
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Explorar Cromos | Cambio Cromos',
  description: 'Explora cromos disponibles para intercambio y venta. Encuentra los cromos que necesitas en la comunidad de coleccionistas más activa de España.',
  alternates: {
    canonical: `${siteConfig.url}/explorar`,
  },
};

export default async function ExplorePage() {
  const { listings } = await getMarketplaceData({
    limit: 20,
    search: '',
  });

  return (
    <PublicMarketplaceContent
      initialListings={listings}
    />
  );
}
