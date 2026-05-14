'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { LeanListingCard } from '@/components/home/LeanListingCard';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { useListings } from '@/hooks/marketplace/useListings';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { AnimatedList } from '@/components/ui/AnimatedList';

export default function MarketplaceShowcase() {
  const t = useTranslations('landing.showcase');
  const { listings, loading, error } = useListings({ limit: 6 });
  const [displayListings, setDisplayListings] = useState<typeof listings>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    logger.debug('MarketplaceShowcase render:', {
      loading,
      listingsCount: listings.length,
      displayListingsCount: displayListings.length,
      isReady
    });

    // Only update display listings when we actually have data and not loading
    if (!loading && listings.length > 0 && !isReady) {
      logger.debug('Setting display listings');
      setDisplayListings(listings);
      setIsReady(true);
    }
  }, [loading, listings, isReady]);

  const hasListings = displayListings.length > 0;
  const showSkeletons = !isReady || loading;

  return (
    <section className="bg-transparent">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gold">
                {t('badge')}
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white uppercase">
                Últimos anuncios publicados
              </h2>
              <p className="mt-2 text-gray-700 dark:text-gray-400 max-w-2xl">
                Publica tus duplicados y encuentra nuevos cromos sin salir de la
                plataforma.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-gold hover:bg-yellow-400 text-gray-900 font-bold border-2 border-black shadow-xl"
            >
              <Link href="/explorar">{t('goToMarket')}</Link>
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{t('error', { error })}</span>
            </div>
          )}

          {showSkeletons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </div>
          ) : hasListings ? (
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayListings.slice(0, 6).map(listing => (
                <LeanListingCard key={listing.id} listing={listing} href={`/explorar/${listing.id}`} />
              ))}
            </AnimatedList>
          ) : null}

          {!showSkeletons && !hasListings && !error && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 dark:bg-gray-800 px-6 py-12 text-center">
              <h3 className="text-2xl font-bold uppercase text-gray-900 dark:text-white">
                Aún no hay anuncios activos
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                Sé la primera persona en publicar tus duplicados y activa la
                comunidad de intercambio.
              </p>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-6 border-2 border-black bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 font-bold"
              >
                <Link href="/marketplace/create">{t('publishBtn')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
