'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { CollectionFilter } from '@/components/marketplace/CollectionFilter';
import { Button } from '@/components/ui/button';
import { Plus, List, MapPin, Clock, Filter, Package, Lightbulb } from 'lucide-react';
import Link from '@/components/ui/link';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { useUser } from '@/components/providers/SupabaseProvider';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Listing } from '@/types/v1.6.0';

interface MarketplaceContentProps {
    initialListings: Listing[];
    initialUserPostcode: string | null;
}

export function MarketplaceContent({ initialListings, initialUserPostcode }: MarketplaceContentProps) {
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByDistance, setSortByDistance] = useState(false);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'cromo' | 'pack'>('all');
    const searchParams = useSearchParams();

    // Auto-apply filters from URL params (e.g. /marketplace?collection=123&search=Eduardo+Coudet)
    useEffect(() => {
        const collectionParam = searchParams.get('collection');
        if (collectionParam) {
            const collectionId = parseInt(collectionParam);
            if (!isNaN(collectionId)) {
                setSelectedCollectionIds([collectionId]);
                setShowFilters(true);
            }
        }
        const searchParam = searchParams.get('search');
        if (searchParam) {
            setSearchQuery(searchParam);
        }
    }, [searchParams]);

    // We use initialUserPostcode from server rendering to avoid a client-side fetch
    const hasPostcode = Boolean(initialUserPostcode);

    // Pass server data as initialData - hook will skip initial fetch if filters are at defaults
    const { listings: fetchedListings, loading, error, hasMore, loadMore } = useListings({
        search: searchQuery,
        limit: 20,
        sortByDistance: sortByDistance && hasPostcode,
        viewerPostcode: initialUserPostcode,
        collectionIds: selectedCollectionIds,
        initialData: initialListings,
    });

    // Simple handlers - hook manages state now
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleSortChange = () => {
        if (hasPostcode) {
            setSortByDistance(!sortByDistance);
        }
    };

    const handleCollectionFilterChange = (ids: number[]) => {
        setSelectedCollectionIds(ids);
    };

    const handleTypeFilterChange = (type: 'all' | 'cromo' | 'pack') => {
        setListingTypeFilter(type);
    };

    // Hook now initializes with server data, so just use fetchedListings directly
    // Apply client-side type filter
    const listings = listingTypeFilter === 'all'
        ? fetchedListings
        : fetchedListings.filter(listing =>
            listingTypeFilter === 'pack' ? listing.is_group : !listing.is_group
        );

    // Loading state logic - show skeletons only when we have no data
    const showSkeletons = loading && listings.length === 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 md:pb-8">
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 pt-4 pb-2 md:py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">
                                <span className="text-black dark:text-white">
                                    Marketplace
                                </span>
                            </h1>

                            {/* Stats Badges */}
                            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                                    <span className="text-base md:text-lg">🔥</span>
                                    <span className="font-bold text-black dark:text-white">{listings.length}</span>
                                    <span className="hidden md:inline">activos</span>
                                </div>
                                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                                    <span className="text-base md:text-lg">👥</span>
                                    <span className="hidden md:inline">Comunidad activa</span>
                                    <span className="md:hidden">Activa</span>
                                </div>
                                {!loading && listings.length > 0 && (
                                    <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0">
                                        <span className="text-base md:text-lg">⚡</span>
                                        <span className="hidden md:inline">Actualizado hoy</span>
                                        <span className="md:hidden">Hoy</span>
                                    </div>
                                )}
                                {/* Mobile: Mis Anuncios aligned to right */}
                                {user && (
                                    <>
                                        <div className="flex-1 md:hidden" />
                                        <Link href="/marketplace/my-listings" className="md:hidden shrink-0">
                                            <div className="h-8 w-8 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer">
                                                <List className="h-4 w-4" />
                                            </div>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {user && (
                            <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
                                {/* Desktop: Mis Anuncios button */}
                                <Link href="/marketplace/my-listings" className="hidden md:block md:flex-none">
                                    <Button
                                        variant="outline"
                                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 h-10 md:h-12 px-3 md:px-6 text-sm"
                                    >
                                        <List className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Mis Anuncios</span>
                                    </Button>
                                </Link>
                                <Link href="/marketplace/create" className="hidden md:flex md:flex-none">
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

            <div className="container mx-auto px-4 pt-5 pb-6 md:py-6">
                {/* Controls Bar with background cover to prevent content peeking through */}
                <div className="sticky z-30 mb-6" style={{ top: 'calc(var(--header-height, 4rem) + 0.5rem)' }}>
                    {/* Background cover that extends behind the sticky bar to hide scrolling content */}
                    <div
                        className="absolute -top-4 left-0 right-0 h-4 bg-gray-50 dark:bg-gray-900 -mx-4"
                        style={{ width: 'calc(100% + 2rem)' }}
                        aria-hidden="true"
                    />
                    <div className="relative bg-white dark:bg-gray-800 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search */}
                            <div className="flex-1">
                                <SearchBar
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Buscar por nombre, colección..."
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000]/20"
                                />
                            </div>

                            {/* Mobile Filter Toggle */}
                            <div className="md:hidden flex gap-2">
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="outline"
                                    className={`flex-1 ${showFilters ? 'bg-[#FFC000]/10 text-black dark:text-white border-[#FFC000]/50' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                                <Button
                                    onClick={handleSortChange}
                                    variant="outline"
                                    className={`flex-1 ${sortByDistance ? 'bg-[#FFC000]/10 text-black dark:text-white border-[#FFC000]/50' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                                    disabled={!hasPostcode}
                                >
                                    {sortByDistance ? <MapPin className="mr-2 h-4 w-4" /> : <Clock className="mr-2 h-4 w-4" />}
                                    {sortByDistance ? 'Cerca' : 'Reciente'}
                                </Button>
                            </div>

                            {/* Desktop Filters */}
                            <div className={`flex-col md:flex-row gap-3 md:flex ${showFilters ? 'flex' : 'hidden'}`}>
                                {/* Listing Type Filter */}
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                                    <button
                                        onClick={() => handleTypeFilterChange('all')}
                                        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'all'
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => handleTypeFilterChange('cromo')}
                                        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'cromo'
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        Cromo
                                    </button>
                                    <button
                                        onClick={() => handleTypeFilterChange('pack')}
                                        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'pack'
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        Pack
                                    </button>
                                </div>

                                {user && (
                                    <div className="w-full md:w-64">
                                        <CollectionFilter
                                            selectedCollectionIds={selectedCollectionIds}
                                            onSelectionChange={handleCollectionFilterChange}
                                        />
                                    </div>
                                )}

                                <div className="hidden lg:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        onClick={() => {
                                            setSortByDistance(false);
                                        }}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${!sortByDistance
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        Reciente
                                    </button>
                                    <button
                                        onClick={handleSortChange}
                                        disabled={!hasPostcode}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${sortByDistance
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
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

                {/* Contextual Tip */}
                <ContextualTip
                    tipId="tip-marketplace"
                    icon={Lightbulb}
                    title="Encuentra lo que buscas"
                    description="Busca cromos por nombre o filtra por colección. Cuando encuentres algo que te interese, abre un chat con el vendedor para acordar un intercambio."
                    className="mb-6"
                />

                {/* Listings Grid */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 p-6 rounded-xl mb-8 text-center">
                        <p className="font-bold text-lg mb-1">Error al cargar anuncios</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                )}

                {showSkeletons ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <ListingCardSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {listings.map((listing: Listing) => (
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
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-8 py-6 text-lg h-auto rounded-xl shadow-sm"
                        >
                            Cargar Más Anuncios
                        </Button>
                    </div>
                )}

                {/* Loading Spinner for Load More */}
                {loading && listings.length > 0 && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && listings.length === 0 && (
                    <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
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
