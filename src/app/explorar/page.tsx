import { getMarketplaceData } from '@/lib/marketplace/server-listings';
import { PublicMarketplaceContent } from '@/components/marketplace/PublicMarketplaceContent';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

// Revalidate every 30 seconds - enables ISR caching for faster page loads
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Explorar Cromos',
  description: 'Explora cromos disponibles para intercambio y venta. Encuentra los cromos que necesitas en la comunidad de coleccionistas más activa de España.',
  alternates: {
    canonical: `${siteConfig.url}/explorar`,
  },
  openGraph: {
    title: 'Explorar Cromos',
    description: 'Explora cromos disponibles para intercambio y venta. Encuentra los cromos que necesitas en la comunidad de coleccionistas más activa de España.',
    url: `${siteConfig.url}/explorar`,
    siteName: siteConfig.name,
    type: 'website',
  },
};

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Explorar Cromos — Cambiocromos',
  description: 'Explora cromos disponibles para intercambio y venta. Encuentra los cromos que necesitas en la comunidad de coleccionistas más activa de España.',
  url: `${siteConfig.url}/explorar`,
  isPartOf: {
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export default async function ExplorePage() {
  const { listings } = await getMarketplaceData({
    limit: 20,
    search: '',
  });

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
