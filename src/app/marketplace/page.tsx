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
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#111827] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a]/30 via-[#111827] to-[#111827] border-b border-white/5">
        {/* Subtle glow effect */}
        <div className="absolute top-0 left-0 w-[600px] h-[300px] bg-[#1e3a8a]/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 py-6 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3 md:mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFC000] to-white">
                  Marketplace
                </span>
              </h1>
              
              {/* Stats Badges - Horizontal scroll on mobile */}
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs md:text-sm font-medium text-white flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                  <span className="text-base md:text-lg">🔥</span>
                  <span className="font-bold text-[#FFC000]">{listings.length}</span>
                  <span className="hidden md:inline">activos</span>
                </div>
                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs md:text-sm font-medium text-white flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                  <span className="text-base md:text-lg">👥</span>
                  <span className="hidden md:inline">Comunidad activa</span>
                  <span className="md:hidden">Activa</span>
                </div>
                {!loading && listings.length > 0 && (
                  <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs md:text-sm font-medium text-white flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
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
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm h-10 md:h-12 px-3 md:px-6 text-sm"
                  >
                    <List className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Mis Anuncios</span>
                  </Button>
                </Link>
                <Link href="/marketplace/create" className="hidden md:block md:flex-none">
                  <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold h-10 md:h-12 px-4 md:px-6 shadow-[0_0_20px_rgba(255,192,0,0.2)] hover:shadow-[0_0_30px_rgba(255,192,0,0.4)] transition-all text-sm">
                    <Plus className="mr-1 md:mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Controls Bar */}
        <div className="sticky top-4 z-30 mb-8">
          <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar por título, colección..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#FFC000]/50"
                />
              </div>

              {/* Mobile Filter Toggle */}
              <div className="md:hidden flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className={`flex-1 border-white/10 ${showFilters ? 'bg-[#FFC000]/10 text-[#FFC000] border-[#FFC000]/50' : 'bg-white/5 text-gray-400'}`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
                <Button
                  onClick={() => hasPostcode && setSortByDistance(!sortByDistance)}
                  variant="outline"
                  className={`flex-1 border-white/10 ${sortByDistance ? 'bg-[#FFC000]/10 text-[#FFC000] border-[#FFC000]/50' : 'bg-white/5 text-gray-400'}`}
                  disabled={!hasPostcode}
                >
                  {sortByDistance ? <MapPin className="mr-2 h-4 w-4" /> : <Clock className="mr-2 h-4 w-4" />}
                  {sortByDistance ? 'Cerca' : 'Reciente'}
                </Button>
              </div>

              {/* Desktop Filters */}
              <div className={`flex-col md:flex-row gap-4 md:flex ${showFilters ? 'flex' : 'hidden'}`}>
                {/* Listing Type Filter */}
                <div className="bg-white/5 rounded-lg p-1 border border-white/10 flex">
                  <button
                    onClick={() => setListingTypeFilter('all')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                      listingTypeFilter === 'all'
                        ? 'bg-[#FFC000] text-black shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setListingTypeFilter('cromo')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                      listingTypeFilter === 'cromo'
                        ? 'bg-[#FFC000] text-black shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Cromo
                  </button>
                  <button
                    onClick={() => setListingTypeFilter('pack')}
                    className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                      listingTypeFilter === 'pack'
                        ? 'bg-[#FFC000] text-black shadow-lg'
                        : 'text-gray-400 hover:text-white'
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

                <div className="hidden lg:flex bg-white/5 rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => setSortByDistance(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      !sortByDistance
                        ? 'bg-[#FFC000] text-black shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Reciente
                  </button>
                  <button
                    onClick={() => hasPostcode && setSortByDistance(true)}
                    disabled={!hasPostcode}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      sortByDistance
                        ? 'bg-[#FFC000] text-black shadow-lg'
                        : 'text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
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
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-xl mb-8 text-center">
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
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-8 py-6 text-lg h-auto rounded-xl backdrop-blur-sm"
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
          <div className="mt-12">
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
