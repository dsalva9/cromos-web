'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useListings } from '@/hooks/marketplace/useListings';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { CollectionFilter } from '@/components/marketplace/CollectionFilter';
import { Button } from '@/components/ui/button';
import { Plus, List, MapPin, Clock, Filter, Package, Lightbulb, BellPlus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from '@/components/ui/link';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { useUser } from '@/components/providers/SupabaseProvider';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Listing } from '@/types/v1.6.0';
import { AnimatedList } from '@/components/ui/AnimatedList';
import { SponsoredCard } from '@/components/marketplace/SponsoredCard';
import { SPONSORED_PRODUCT_CUBE, SPONSORED_PRODUCT_ALBUM } from '@/lib/marketplace/sponsored-product';
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner';
import { AndroidInstallFullscreenModal } from '@/components/pwa/AndroidInstallFullscreenModal';
import { useTranslations } from 'next-intl';

interface MarketplaceContentProps {
    initialListings: Listing[];
    initialUserPostcode: string | null;
}

export function MarketplaceContent({ initialListings, initialUserPostcode }: MarketplaceContentProps) {
    const t = useTranslations('marketplace.index');
    const ts = useTranslations('marketplace.sponsored');
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByDistance, setSortByDistance] = useState(false);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchBarExpanded, setSearchBarExpanded] = useState(false);
    const controlsBarRef = useRef<HTMLDivElement>(null);
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'cromo' | 'pack'>('all');
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const searchParams = useSearchParams();

    const [hasRestored, setHasRestored] = useState(false);
    const scrollRestoredRef = useRef(false);
    const [restoredLimit, setRestoredLimit] = useState(18);

    // 1. Restore state on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const referrer = document.referrer;
        let isComingFromSubpage = false;
        try {
            if (referrer) {
                const referrerUrl = new URL(referrer);
                const pathSegments = referrerUrl.pathname.split('/').filter(Boolean);
                const marketplaceIdx = pathSegments.indexOf('marketplace');
                if (marketplaceIdx !== -1 && pathSegments.length > marketplaceIdx + 1) {
                    isComingFromSubpage = true;
                }
            }
        } catch (e) {
            console.error('Error parsing referrer:', e);
        }

        const navigationEntries = performance.getEntriesByType('navigation');
        const isBackForward = navigationEntries.length > 0 && 
            (navigationEntries[0] as PerformanceNavigationTiming).type === 'back_forward';

        if (isComingFromSubpage || isBackForward) {
            // Restore filters from sessionStorage
            const savedSearch = sessionStorage.getItem('marketplace_searchQuery');
            if (savedSearch !== null) setSearchQuery(savedSearch);

            const savedSort = sessionStorage.getItem('marketplace_sortByDistance');
            if (savedSort !== null) setSortByDistance(savedSort === 'true');

            const savedCollections = sessionStorage.getItem('marketplace_selectedCollectionIds');
            if (savedCollections) {
                try {
                    setSelectedCollectionIds(JSON.parse(savedCollections));
                } catch (e) {
                    console.error('Error parsing saved collections:', e);
                }
            }

            const savedShowFilters = sessionStorage.getItem('marketplace_showFilters');
            if (savedShowFilters !== null) setShowFilters(savedShowFilters === 'true');

            const savedTypeFilter = sessionStorage.getItem('marketplace_listingTypeFilter');
            if (savedTypeFilter !== null) setListingTypeFilter(savedTypeFilter as any);

            // Restore pagination limit to fetch all loaded items at once
            const savedCount = sessionStorage.getItem('marketplace_loaded_count');
            if (savedCount) {
                const count = parseInt(savedCount, 10);
                if (count > 18) {
                    setRestoredLimit(count);
                }
            }
        } else {
            // Fresh visit: clear saved state to start clean
            sessionStorage.removeItem('marketplace_searchQuery');
            sessionStorage.removeItem('marketplace_sortByDistance');
            sessionStorage.removeItem('marketplace_selectedCollectionIds');
            sessionStorage.removeItem('marketplace_showFilters');
            sessionStorage.removeItem('marketplace_listingTypeFilter');
            sessionStorage.removeItem('marketplace_scroll_position');
            sessionStorage.removeItem('marketplace_loaded_count');
        }

        setHasRestored(true);
    }, []);

    // 2. Persist state changes
    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestored) return;

        sessionStorage.setItem('marketplace_searchQuery', searchQuery);
        sessionStorage.setItem('marketplace_sortByDistance', String(sortByDistance));
        sessionStorage.setItem('marketplace_selectedCollectionIds', JSON.stringify(selectedCollectionIds));
        sessionStorage.setItem('marketplace_showFilters', String(showFilters));
        sessionStorage.setItem('marketplace_listingTypeFilter', listingTypeFilter);
    }, [searchQuery, sortByDistance, selectedCollectionIds, showFilters, listingTypeFilter, hasRestored]);



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

    // Close mobile search bar expansion when tapping outside the controls bar
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
        setIsHeaderHidden(false); // Force show header on focus
    }, []);

    const handleSearchBlur = useCallback(() => {
        // Delay to allow button clicks to register before collapsing
        setTimeout(() => {
            if (controlsBarRef.current?.contains(document.activeElement)) return;
            setSearchBarExpanded(false);
        }, 150);
    }, []);

    // We use initialUserPostcode from server rendering to avoid a client-side fetch
    const hasPostcode = Boolean(initialUserPostcode);

    // Pass server data as initialData - hook will skip initial fetch if filters are at defaults
    const { listings: fetchedListings, loading, error, hasMore, loadMore } = useListings({
        search: searchQuery,
        limit: restoredLimit, // Use our restored dynamic limit!
        sortByDistance: sortByDistance && hasPostcode,
        viewerPostcode: initialUserPostcode,
        collectionIds: selectedCollectionIds,
        initialData: initialListings,
        listingTypeFilter: listingTypeFilter,
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
    const listings = fetchedListings;

    // 2.5. Persist the number of loaded listings
    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestored || listings.length === 0) return;
        sessionStorage.setItem('marketplace_loaded_count', String(listings.length));
    }, [listings.length, hasRestored]);

    // 3. Track scroll position in real-time
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            // ONLY track and update scroll position once we have successfully finished restoring it!
            // This prevents initial layout height changes and browser clamping from wiping out the saved position with 0.
            if (hasRestored && scrollRestoredRef.current) {
                sessionStorage.setItem('marketplace_scroll_position', String(window.scrollY));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasRestored]);

    // 3.5. Smart hide header & search bar on mobile scroll
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            if (window.innerWidth >= 768) {
                setIsHeaderHidden(false);
                return;
            }

            // Do not hide the header if the search bar is expanded (focused) or if any input/textarea is currently focused
            const isInputFocused = document.activeElement && 
                (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
            if (searchBarExpanded || isInputFocused) {
                setIsHeaderHidden(false);
                return;
            }

            const currentScrollY = window.scrollY;
            if (Math.abs(currentScrollY - lastScrollY) < 10) {
                return;
            }

            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setIsHeaderHidden(true);
            } else if (currentScrollY < lastScrollY) {
                setIsHeaderHidden(false);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [searchBarExpanded]);

    // 4. Restore scroll position once listings are rendered
    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestored || scrollRestoredRef.current) return;

        if (listings.length > 0 || !loading) {
            const savedPosition = sessionStorage.getItem('marketplace_scroll_position');
            if (savedPosition) {
                const targetScrollY = parseInt(savedPosition, 10);
                if (targetScrollY > 0 && listings.length > 0) {
                    let attempts = 0;
                    const maxAttempts = 10; // Try 10 times over 500ms (every 50ms) to ensure layout shifts are settled
                    
                    const restoreInterval = setInterval(() => {
                        window.scrollTo({
                            top: targetScrollY,
                            behavior: 'instant' as ScrollBehavior,
                        });
                        attempts++;
                        
                        if (attempts >= maxAttempts) {
                            clearInterval(restoreInterval);
                            // Enable scroll tracking only after restoration settles down fully
                            scrollRestoredRef.current = true;
                        }
                    }, 50);
                } else {
                    scrollRestoredRef.current = true;
                }
            } else {
                scrollRestoredRef.current = true;
            }
        }
    }, [listings.length, loading, hasRestored]);

    // Loading state logic - show skeletons only when we have no data
    const showSkeletons = !hasRestored || (loading && listings.length === 0);

    const showMobileFilters = searchBarExpanded || searchQuery.trim() !== '';

    return (
        <div className="text-gray-900 dark:text-white">
            <AndroidInstallFullscreenModal />
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 pt-3 pb-1 md:pt-4 md:pb-2 md:py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between w-full mb-1 md:mb-3">
                                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                                    <span className="text-black dark:text-white">
                                        {t('title')}
                                    </span>
                                </h1>
                                {/* Mobile: Mis Anuncios aligned to right at the same level as the title */}
                                {user && (
                                    <Link href="/marketplace/my-listings" className="md:hidden shrink-0">
                                        <div className="h-9 w-9 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer">
                                            <List className="h-5 w-5" />
                                        </div>
                                    </Link>
                                )}
                            </div>

                            {/* Mobile web install prompt */}
                            <InstallAppBanner />
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

                        {user && (
                            <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
                                {/* Desktop: Mis Anuncios button */}
                                <Link href="/marketplace/my-listings" className="hidden md:block md:flex-none">
                                    <Button
                                        variant="outline"
                                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 h-10 md:h-12 px-3 md:px-6 text-sm"
                                    >
                                        <List className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">{t('buttons.myListings')}</span>
                                    </Button>
                                </Link>
                                <Link href="/marketplace/create" className="hidden md:flex md:flex-none">
                                    <Button className="w-full bg-gold text-black hover:bg-gold-light font-bold h-10 md:h-12 px-4 md:px-6 shadow-md hover:shadow-lg transition-all text-sm">
                                        <Plus className="mr-1 md:mr-2 h-4 w-4" />
                                        {t('buttons.publish')}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-3 pb-6 md:py-6">
                {/* Controls Bar with background cover to prevent content peeking through */}
                <div
                    className={cn(
                        "sticky z-30 mb-6 transition-transform duration-300 ease-in-out",
                        isHeaderHidden ? "transform -translate-y-[calc(100%+6rem)] md:translate-y-0" : "transform translate-y-0"
                    )}
                    style={{ top: 'calc(var(--header-height, 4rem) + var(--sat, 0px) + 0.5rem)' }}
                >
                    {/* Background cover that extends behind the sticky bar to hide scrolling content */}
                    <div
                        className="absolute -top-4 left-0 right-0 h-4 bg-gray-50 dark:bg-gray-900 -mx-4"
                        style={{ width: 'calc(100% + 2rem)' }}
                        aria-hidden="true"
                    />
                    <div ref={controlsBarRef} className="relative bg-white dark:bg-gray-800 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 flex gap-2">
                                <div className="flex-1">
                                <SearchBar
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder={t('search.placeholder')}
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-gold focus:ring-gold/20"
                                    onFocus={handleSearchFocus}
                                    onBlur={handleSearchBlur}
                                />
                                </div>
                                {user && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            if (searchQuery.trim()) params.set('search', searchQuery.trim());
                                            if (selectedCollectionIds.length === 1) params.set('collection', String(selectedCollectionIds[0]));
                                            window.location.href = `/${document.documentElement.lang || 'es'}/alertas${params.toString() ? '?' + params.toString() : ''}`;
                                        }}
                                        className={cn(
                                            'flex-shrink-0 h-10 w-10 rounded-lg transition-all',
                                            searchQuery.trim()
                                                ? 'text-gold hover:bg-gold/10 hover:text-gold'
                                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                                        )}
                                        title={t('createAlert')}
                                    >
                                        <BellPlus className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>

                            {/* Mobile Filter Toggle — hidden by default, shown when search bar is tapped or text is active */}
                            <div
                                className={cn(
                                    "md:hidden flex gap-2 transition-all duration-200 ease-in-out overflow-hidden",
                                    showMobileFilters
                                        ? "max-h-20 opacity-100 mt-1"
                                        : "max-h-0 opacity-0"
                                )}
                            >
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="outline"
                                    className={cn(
                                        "flex-1 h-9 text-xs font-semibold",
                                        showFilters 
                                            ? "bg-gold/10 text-black dark:text-white border-gold/50" 
                                            : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                                    )}
                                >
                                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                                    {t('buttons.filters')}
                                </Button>
                                
                                {/* Recent | Near toggle */}
                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex border border-gray-200 dark:border-gray-600 h-9">
                                    <button
                                        type="button"
                                        onClick={() => setSortByDistance(false)}
                                        className={cn(
                                            "flex-1 py-1 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1",
                                            !sortByDistance
                                                ? "bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                        )}
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                        {t('buttons.recent')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (hasPostcode) setSortByDistance(true);
                                        }}
                                        disabled={!hasPostcode}
                                        className={cn(
                                            "flex-1 py-1 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1",
                                            sortByDistance
                                                ? "bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                        )}
                                        title={!hasPostcode ? t('errors.distanceDisabled') : undefined}
                                    >
                                        <MapPin className="h-3.5 w-3.5" />
                                        {t('buttons.near')}
                                    </button>
                                </div>
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
                                        {t('typeFilter.all')}
                                    </button>
                                    <button
                                        onClick={() => handleTypeFilterChange('cromo')}
                                        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'cromo'
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        {t('typeFilter.cromo')}
                                    </button>
                                    <button
                                        onClick={() => handleTypeFilterChange('pack')}
                                        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${listingTypeFilter === 'pack'
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        {t('typeFilter.pack')}
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
                                        {t('buttons.recent')}
                                    </button>
                                    <button
                                        onClick={handleSortChange}
                                        disabled={!hasPostcode}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${sortByDistance
                                            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                        title={!hasPostcode ? t('errors.distanceDisabled') : undefined}
                                    >
                                        {t('buttons.distance')}
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
                    title={t('tip.title')}
                    description={t('tip.description')}
                    className="mb-6"
                />

                {/* Listings Grid */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 p-6 rounded-xl mb-8 text-center">
                        <p className="font-bold text-lg mb-1">{t('errors.loadFailed')}</p>
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
                    <AnimatedList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {listings.length > 0 && !searchQuery.trim() && (
                            <SponsoredCard key="sponsored-cube-card" product={SPONSORED_PRODUCT_CUBE} />
                        )}
                        {listings.flatMap((listing: Listing, index: number) => {
                            const card = <ListingCard key={listing.id} listing={listing} />;
                            if (index === 17 && !searchQuery.trim()) {
                                return [
                                    card,
                                    <SponsoredCard key="sponsored-album-card" product={SPONSORED_PRODUCT_ALBUM} />
                                ];
                            }
                            return [card];
                        })}
                    </AnimatedList>
                )}

                {/* Load More */}
                {hasMore && !loading && listings.length > 0 && (
                    <div className="flex justify-center mt-12">
                        <Button
                            onClick={loadMore}
                            variant="outline"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-8 py-6 text-lg h-auto rounded-xl shadow-sm"
                        >
                            {t('buttons.loadMore')}
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
                                searchQuery ? t('empty.searchTitle') : t('empty.quietTitle')
                            }
                            description={
                                searchQuery
                                    ? t('empty.searchDescription')
                                    : user
                                        ? t('empty.quietDescriptionAuth')
                                        : t('empty.quietDescriptionNoAuth')
                            }
                            actionLabel={user ? t('empty.publishFirst') : t('empty.login')}
                            actionHref={user ? '/marketplace/create' : '/login'}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
