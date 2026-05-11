'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useListings } from '@/hooks/marketplace/useListings';
import { LeanListingCard } from '@/components/home/LeanListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { Button } from '@/components/ui/button';
import { Filter, Package, ArrowRight } from 'lucide-react';
import Link from '@/components/ui/link';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Listing } from '@/types/v1.6.0';

interface PublicMarketplaceContentProps {
    initialListings: Listing[];
}

export function PublicMarketplaceContent({ initialListings }: PublicMarketplaceContentProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [searchBarExpanded, setSearchBarExpanded] = useState(false);
    const controlsBarRef = useRef<HTMLDivElement>(null);
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'cromo' | 'pack'>('all');
    const searchParams = useSearchParams();

    // Auto-apply filters from URL params
    useEffect(() => {
        const searchParam = searchParams.get('search');
        if (searchParam) {
            setSearchQuery(searchParam);
        }
    }, [searchParams]);

    // Close mobile search bar expansion when tapping outside
    useEffect(() => {
        if (!searchBarExpanded) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (controlsBarRef.current && !controlsBarRef.current.contains(e.target as Node)) {
                setSearchBarExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [searchBarExpanded]);

    const handleSearchFocus = useCallback(() => {
        setSearchBarExpanded(true);
    }, []);

    const handleSearchBlur = useCallback(() => {
        setTimeout(() => {
            if (controlsBarRef.current?.contains(document.activeElement)) return;
            setSearchBarExpanded(false);
        }, 150);
    }, []);

    const { listings: fetchedListings, loading, error, hasMore, loadMore } = useListings({
        search: searchQuery,
        limit: 20,
        sortByDistance: false,
        viewerPostcode: null,
        collectionIds: [],
        initialData: initialListings,
    });

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleTypeFilterChange = (type: 'all' | 'cromo' | 'pack') => {
        setListingTypeFilter(type);
    };

    // Apply client-side type filter
    const listings = listingTypeFilter === 'all'
        ? fetchedListings
        : fetchedListings.filter(listing =>
            listingTypeFilter === 'pack' ? listing.is_group : !listing.is_group
        );

    const showSkeletons = loading && listings.length === 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 pt-4 pb-2 md:py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">
                                <span className="text-black dark:text-white">
                                    Explorar Cromos
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
                            </div>
                        </div>

                        {/* Register CTA */}
                        <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
                            <Link href="/signup" className="w-full md:w-auto">
                                <Button className="w-full bg-gold text-black hover:bg-gold-light font-bold h-10 md:h-12 px-4 md:px-6 shadow-md hover:shadow-lg transition-all text-sm">
                                    Registrarse para Intercambiar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-5 pb-6 md:py-6">
                {/* Controls Bar */}
                <div className="sticky z-30 mb-6" style={{ top: 'calc(var(--header-height, 4rem) + var(--sat, 0px) + 0.5rem)' }}>
                    <div
                        className="absolute -top-4 left-0 right-0 h-4 bg-gray-50 dark:bg-gray-900 -mx-4"
                        style={{ width: 'calc(100% + 2rem)' }}
                        aria-hidden="true"
                    />
                    <div ref={controlsBarRef} className="relative bg-white dark:bg-gray-800 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search */}
                            <div className="flex-1">
                                <SearchBar
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Buscar por nombre, colección..."
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-gold focus:ring-gold/20"
                                    onFocus={handleSearchFocus}
                                    onBlur={handleSearchBlur}
                                />
                            </div>

                            {/* Mobile Filter Toggle — hidden by default, shown when search bar is tapped */}
                            <div
                                className={`md:hidden flex gap-2 transition-all duration-200 ease-in-out overflow-hidden ${
                                    searchBarExpanded
                                        ? 'max-h-20 opacity-100'
                                        : 'max-h-0 opacity-0'
                                }`}
                            >
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="outline"
                                    className={`flex-1 ${showFilters ? 'bg-gold/10 text-black dark:text-white border-gold/50' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                            </div>

                            {/* Type Filter */}
                            <div className={`flex-col md:flex-row gap-3 md:flex ${showFilters ? 'flex' : 'hidden'}`}>
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
                            </div>
                        </div>
                    </div>
                </div>

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
                            <LeanListingCard key={listing.id} listing={listing} href={`/explorar/${listing.id}`} />
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
                        <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
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
                                    : 'Regístrate para publicar tus duplicados y comienza a intercambiar'
                            }
                            actionLabel="Registrarse"
                            actionHref="/signup"
                        />
                    </div>
                )}

                {/* Registration CTA Banner */}
                {!loading && listings.length > 0 && (
                    <div className="mt-12 bg-gold rounded-2xl p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        <div className="relative z-10">
                            <h2 className="text-2xl md:text-3xl font-black uppercase text-black mb-3">
                                ¿Te interesa algún cromo?
                            </h2>
                            <p className="text-black/80 font-medium mb-6 max-w-lg mx-auto">
                                Regístrate gratis para contactar con los vendedores e intercambiar tus cromos
                            </p>
                            <Button
                                asChild
                                size="lg"
                                className="bg-black hover:bg-gray-800 text-white font-black text-lg h-14 px-10 border-2 border-transparent shadow-2xl transition-all hover:scale-105 rounded-full"
                            >
                                <Link href="/signup">
                                    Crear Cuenta Gratis <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
