'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useListings } from '@/hooks/marketplace/useListings';
import { LeanListingCard } from '@/components/home/LeanListingCard';
import { SponsoredCard } from '@/components/marketplace/SponsoredCard';
import { SPONSORED_PRODUCT_CUBE, SPONSORED_PRODUCT_ALBUM } from '@/lib/marketplace/sponsored-product';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { Button } from '@/components/ui/button';
import { Filter, Package, ArrowRight, ChevronRight } from 'lucide-react';
import Link from '@/components/ui/link';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Listing } from '@/types/v1.6.0';

interface PublicMarketplaceContentProps {
    initialListings: Listing[];
}

export function PublicMarketplaceContent({ initialListings }: PublicMarketplaceContentProps) {
    const t = useTranslations('marketplace.public');
    const ts = useTranslations('marketplace.sponsored');
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
        limit: 18,
        sortByDistance: false,
        viewerPostcode: null,
        collectionIds: [],
        initialData: initialListings,
        listingTypeFilter: listingTypeFilter,
    });

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleTypeFilterChange = (type: 'all' | 'cromo' | 'pack') => {
        setListingTypeFilter(type);
    };

    // Hook now initializes with server data, so just use fetchedListings directly
    const listings = fetchedListings;

    const showSkeletons = loading && listings.length === 0;

    return (
        <div className="text-gray-900 dark:text-white">
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 pt-3 pb-1 md:pt-4 md:pb-2 md:py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-1 md:mb-3">
                                <span className="text-black dark:text-white">
                                    {t('title')}
                                </span>
                            </h1>

                            {/* Horizontal Sponsored Book Banner */}
                            <div className="mt-2 md:mt-3 max-w-2xl w-full">
                                <a
                                    href="https://amzn.to/3QNkf7q"
                                    target="_blank"
                                    rel="noopener sponsored nofollow"
                                    className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50/70 dark:from-amber-950/15 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-2.5 sm:p-3 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 transition-all duration-300 cursor-pointer group"
                                >
                                    <div className="relative w-10 h-14 sm:w-12 sm:h-16 shrink-0 rounded-md overflow-hidden border border-gray-200/40 dark:border-gray-800 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)] bg-white dark:bg-gray-800 flex items-center justify-center p-0.5">
                                        <Image
                                            src="/assets/amazon_images/book.jpg"
                                            alt={ts('bookTitle')}
                                            fill
                                            className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-105"
                                            sizes="(max-width: 640px) 40px, 48px"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/30 uppercase tracking-wider">
                                                {ts('badge')}
                                            </span>
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                ⭐⭐⭐⭐⭐ (4.8)
                                            </span>
                                        </div>
                                        <h4 className="text-xs md:text-sm font-black text-amber-950 dark:text-amber-200 mt-1 truncate">
                                            {ts('bookTitle')}
                                        </h4>
                                        <p className="text-[10px] md:text-xs text-amber-800/80 dark:text-amber-400/80 mt-0.5 truncate">
                                            {ts('bookTagline')}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center text-[10px] sm:text-xs font-black uppercase text-amber-600 dark:text-amber-400 gap-0.5 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-amber-200/40 dark:border-amber-800/40 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all duration-200">
                                        <span className="hidden sm:inline">{ts('ctaBook')}</span>
                                        <span className="sm:hidden">Amazon</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Register CTA */}
                        <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
                            <Link href="/signup" className="w-full md:w-auto">
                                <Button className="w-full bg-gold text-black hover:bg-gold-light font-bold h-10 md:h-12 px-4 md:px-6 shadow-md hover:shadow-lg transition-all text-sm">
                                    {t('registerCtaBtn')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-3 pb-6 md:py-6">
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
                                    placeholder={t('searchPlaceholder')}
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
                                    {t('filterBtn')}
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
                        <p className="font-bold text-lg mb-1">{t('errorTitle')}</p>
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
                        {listings.length > 0 && !searchQuery.trim() && (
                            <SponsoredCard key="sponsored-cube-card" product={SPONSORED_PRODUCT_CUBE} />
                        )}
                        {listings.flatMap((listing: Listing, index: number) => {
                            const card = <LeanListingCard key={listing.id} listing={listing} href={`/explorar/${listing.id}`} />;
                            if (index === 17 && !searchQuery.trim()) {
                                return [
                                    card,
                                    <SponsoredCard key="sponsored-album-card" product={SPONSORED_PRODUCT_ALBUM} />
                                ];
                            }
                            return [card];
                        })}
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
                            {t('loadMoreBtn')}
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
                                searchQuery ? t('emptyState.searchTitle') : t('emptyState.quietTitle')
                            }
                            description={
                                searchQuery
                                    ? t('emptyState.searchDesc')
                                    : t('emptyState.quietDesc')
                            }
                            actionLabel={t('emptyState.registerBtn')}
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
                                {t('ctaBanner.title')}
                            </h2>
                            <p className="text-black/80 font-medium mb-6 max-w-lg mx-auto">
                                {t('ctaBanner.desc')}
                            </p>
                            <Button
                                asChild
                                size="lg"
                                className="bg-black hover:bg-gray-800 text-white font-black text-lg h-14 px-10 border-2 border-transparent shadow-2xl transition-all hover:scale-105 rounded-full"
                            >
                                <Link href="/signup">
                                    {t('ctaBanner.registerBtn')} <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
