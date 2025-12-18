'use client';

import { useState, useEffect } from 'react';
import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { CollectionFilter } from '@/components/marketplace/CollectionFilter';
import { Button } from '@/components/ui/button';
import { Plus, List, MapPin, Clock, Filter } from 'lucide-react';
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
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>(
    []
  );
  const [showFilters, setShowFilters] = useState(false);
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'cromo' | 'pack'>('all');

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

  const { listings: allListings, loading, error, hasMore, loadMore } = useListings({
    search: searchQuery,
    limit: 20,
    sortByDistance: sortByDistance && hasPostcode,
    viewerPostcode: userPostcode,
    collectionIds: selectedCollectionIds,
  });

  // Filter listings based on type
  const listings = listingTypeFilter === 'all'
    ? allListings
    : allListings.filter(listing =>
      listingTypeFilter === 'pack' ? listing.is_group : !listing.is_group
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">
                <span className="text-black">
                  Marketplace
                </span>
              </h1>

              {/* Stats Badges */}
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 border border-gray-200 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                  <span className="text-base md:text-lg">🔥</span>
                  <span className="font-bold text-black">{listings.length}</span>
                  <span className="hidden md:inline">activos</span>
                </div>
                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 border border-gray-200 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                  <span className="text-base md:text-lg">👥</span>
                  <span className="hidden md:inline">Comunidad activa</span>
                  <span className="md:hidden">Activa</span>
                </div>
                {!loading && listings.length > 0 && (
                  <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 border border-gray-200 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                    <span className="text-base md:text-lg">⚡</span>
                    <span className="hidden md:inline">Actualizado hoy</span>
                    <span className="md:hidden">Hoy</span>
                  </div>
                )}
              </div>
            </div>

            {user && (
              <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
                <Link href="/marketplace/my-listings" className="md:flex-none">
                  <Button
                    variant="outline"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-10 md:h-12 px-3 md:px-6 text-sm"
                  >
                    <List className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Mis Anuncios</span>
                  </Button>
                </Link>
                <Link href="/marketplace/create" className="hidden md:block md:flex-none">
                  <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold h-10 md:h-12 px-4 md:px-6 shadow-md hover:shadow-lg transition-all text-sm">
                    <Plus className="mr-1 md:mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Controls Bar */}
        <div className="sticky top-20 md:top-24 z-30 mb-6">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl p-3 shadow-lg">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar por título, colección..."
                  className="bg-gray-50 border-gray-200 text-black placeholder:text-gray-500 focus:border-[#FFC000] focus:ring-[#FFC000]/20"
                />
              </div>

              {/* Mobile Filter Toggle */}
              <div className="md:hidden flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className={`flex-1 ${showFilters ? 'bg-[#FFC000]/10 text-black border-[#FFC000]/50' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
                <Button
                  onClick={() => hasPostcode && setSortByDistance(!sortByDistance)}
                  variant="outline"
                  className={`flex-1 ${sortByDistance ? 'bg-[#FFC000]/10 text-black border-[#FFC000]/50' : 'bg-white text-gray-600 border-gray-200'}`}
                  disabled={!hasPostcode}
                >
                  {sortByDistance ? <MapPin className="mr-2 h-4 w-4" /> : <Clock className="mr-2 h-4 w-4" />}
                  {sortByDistance ? 'Cerca' : 'Reciente'}
                </Button>
              </div>

              {/* Desktop Filters */}
              <div className={`flex-col md:flex-row gap-3 md:flex ${showFilters ? 'flex' : 'hidden'}`}>
                {/* Listing Type Filter */}
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => setListingTypeFilter('all')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'all'
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setListingTypeFilter('cromo')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'cromo'
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Cromo
                  </button>
                  <button
                    onClick={() => setListingTypeFilter('pack')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'pack'
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Pack
                  </button>
                </div>

                {user && (
                  <div className="w-full md:w-64">
                    <CollectionFilter
                      selectedCollectionIds={selectedCollectionIds}
                      onSelectionChange={setSelectedCollectionIds}
                    />
                  </div>
                )}

                <div className="hidden lg:flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setSortByDistance(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${!sortByDistance
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Reciente
                  </button>
                  <button
                    onClick={() => hasPostcode && setSortByDistance(true)}
                    disabled={!hasPostcode}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${sortByDistance
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    title={!hasPostcode ? 'Añade tu código postal en el perfil' : undefined}
                  >
                    Distancia
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-6 rounded-xl mb-8 text-center">
            <p className="font-bold text-lg mb-1">Error al cargar anuncios</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && listings.length > 0 && (
          <div className="flex justify-center mt-12">
            <Button
              onClick={loadMore}
              variant="outline"
              className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50 px-8 py-6 text-lg h-auto rounded-xl shadow-sm"
            >
              Cargar Más Anuncios
            </Button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && listings.length > 0 && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <EmptyState
              icon={Package}
              title={
                searchQuery ? 'No se encontraron anuncios' : 'El mercado está tranquilo'
              }
              description={
                searchQuery
                  ? 'Intenta buscar con otros términos o filtros'
                  : user
                    ? 'Sé el primero en publicar un anuncio y comienza a intercambiar'
                    : 'Inicia sesión para ver las mejores ofertas de la comunidad'
              }
              actionLabel={user ? 'Publicar Primer Anuncio' : 'Iniciar Sesión'}
              actionHref={user ? '/marketplace/create' : '/login'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
