'use client';

import { useState, useEffect } from 'react';
import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { Button } from '@/components/ui/button';
import { Plus, List, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import { useUser, useSupabase } from '@/components/providers/SupabaseProvider';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';

export default function MarketplacePage() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [userPostcode, setUserPostcode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);

  // Fetch user's postcode only
  useEffect(() => {
    if (!user) return;

    const fetchPostcode = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('postcode')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserPostcode(data.postcode);
      }
    };

    fetchPostcode();
  }, [user, supabase]);

  const hasPostcode = Boolean(userPostcode);

  const { listings, loading, error, hasMore, loadMore } = useListings({
    search: searchQuery,
    limit: 20,
    sortByDistance: sortByDistance && hasPostcode,
    viewerPostcode: userPostcode,
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
            <div className="flex gap-2">
              <Link href="/marketplace/my-listings">
                <Button
                  variant="outline"
                  className="border-2 border-black text-white hover:bg-[#374151]"
                >
                  <List className="mr-2 h-4 w-4" />
                  Mis Anuncios
                </Button>
              </Link>
              <Link href="/marketplace/create">
                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                  <Plus className="mr-2 h-4 w-4" />
                  Publicar Anuncio
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por título, colección..."
          />
        </div>

        {/* Sort Controls */}
        <div className="mb-8 flex items-center gap-4">
          <span className="text-sm text-gray-400 font-semibold uppercase">
            Ordenar por:
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => setSortByDistance(false)}
              variant="default"
              className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold border-2 border-black"
              size="sm"
            >
              <Clock className="mr-2 h-4 w-4" />
              Más reciente
            </Button>
          </div>
        </div>

        {/* Listings Grid */}
        {error && (
          <div className="bg-red-900 border-2 border-red-500 text-red-100 p-4 rounded-lg mb-6">
            <p className="font-bold">Error al cargar anuncios</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Loading More State */}
        {loading && listings.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
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
          <EmptyState
            icon={Package}
            title={
              searchQuery ? 'No se encontraron anuncios' : 'Aún no hay anuncios'
            }
            description={
              searchQuery
                ? 'Intenta ajustar tus términos de búsqueda'
                : user
                  ? 'Sé el primero en compartir un cromo con la comunidad'
                  : 'Inicia sesión para publicar tus propios anuncios'
            }
            actionLabel={user ? 'Publicar Primer Anuncio' : 'Iniciar Sesión'}
            actionHref={user ? '/marketplace/create' : '/login'}
          />
        )}
      </div>
    </div>
  );
}
