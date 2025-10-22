'use client';

import { useState } from 'react';
import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/providers/SupabaseProvider';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';

export default function MarketplacePage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const { listings, loading, error, hasMore, loadMore } = useListings({
    search: searchQuery,
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              Marketplace
            </h1>
            <p className="text-gray-400">Descubre cromos de la comunidad</p>
          </div>

          {user && (
            <Link href="/marketplace/create">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                <Plus className="mr-2 h-4 w-4" />
                Publicar Anuncio
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-8">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por título, colección..."
          />
        </div>

        {/* Listings Grid */}
        {error && (
          <div className="bg-red-900 border-2 border-red-500 text-red-100 p-4 rounded-lg mb-6">
            <p className="font-bold">Error al cargar anuncios</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && listings.length === 0 ? (
          <div className="h-1 w-full bg-slate-700/50 overflow-hidden rounded mt-2">
            <div className="h-full w-1/3 bg-[#FFC000] animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && listings.length > 0 && (
          <div className="flex justify-center py-8">
            <CardSkeleton count={1} />
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && listings.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={loadMore}
              variant="outline"
              className="border-2 border-black text-white hover:bg-[#374151]"
            >
              Cargar Más
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#374151] border-2 border-black flex items-center justify-center">
              <Plus className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery
                ? 'No se encontraron anuncios'
                : 'Aún no hay anuncios'}
            </h3>
            <p className="text-gray-400 text-lg mb-6">
              {searchQuery
                ? 'Intenta ajustar tus términos de búsqueda'
                : 'Sé el primero en compartir un cromo con la comunidad'}
            </p>
            {user && !searchQuery && (
              <Link href="/marketplace/create">
                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                  <Plus className="mr-2 h-4 w-4" />
                  Publicar Primer Anuncio
                </Button>
              </Link>
            )}
            {!user && !searchQuery && (
              <div className="space-y-4">
                <p className="text-gray-400">
                  Inicia sesión para publicar tus propios anuncios
                </p>
                <Link href="/login">
                  <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
