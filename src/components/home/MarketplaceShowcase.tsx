'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { useListings } from '@/hooks/marketplace/useListings';
import { AlertCircle } from 'lucide-react';

export default function MarketplaceShowcase() {
  const { listings, loading, error } = useListings({ limit: 6 });

  const hasListings = listings.length > 0;

  return (
    <section className="border-t-4 border-black bg-[#111827]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#FFC000]">
                Marketplace en vivo
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white uppercase">
                Últimos anuncios publicados
              </h2>
              <p className="mt-2 text-gray-300 max-w-2xl">
                Publica tus duplicados y encuentra nuevos cromos sin salir de la
                plataforma. Los listados se actualizan en tiempo real gracias a
                nuestro backend optimizado.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 font-bold border-2 border-black shadow-xl"
            >
              <Link href="/marketplace">Ir al marketplace</Link>
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-red-500 bg-red-900/30 px-4 py-3 text-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>Ha ocurrido un error al cargar los anuncios: {error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && (
              <>
                <ListingCardSkeleton />
                <ListingCardSkeleton />
                <ListingCardSkeleton />
              </>
            )}

            {!loading && hasListings &&
              listings.slice(0, 6).map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
          </div>

          {!loading && !hasListings && !error && (
            <div className="rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/60 px-6 py-12 text-center">
              <h3 className="text-2xl font-bold uppercase text-white">
                Aún no hay anuncios activos
              </h3>
              <p className="mt-3 text-gray-400">
                Sé la primera persona en publicar tus duplicados y activa la
                comunidad de intercambio.
              </p>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-6 border-2 border-black bg-gray-900 text-white hover:bg-gray-800 font-bold"
              >
                <Link href="/marketplace/create">Publicar un anuncio</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
