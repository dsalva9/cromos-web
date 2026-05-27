'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  MapPin,
  ArrowRightLeft,
  Loader2,
  Filter,
  ChevronDown,
  X,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/ui/empty-state';
import { MatchCard } from '@/components/trades/MatchCard';
import { MatchDetailDrawer } from '@/components/trades/MatchDetailDrawer';
import { useFindTraders } from '@/hooks/trades/useFindTraders';
import { useUserCollections } from '@/hooks/templates/useUserCollections';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
  distance_km: number | null;
  postcode: string | null;
  score: number | null;
}

type SortMode = 'overlap' | 'distance' | 'mixed';

// ------------------------------------------------------------------
// Distance bucket helper
// ------------------------------------------------------------------
function formatDistance(km: number | null, t: (key: string) => string): string | null {
  if (km == null) return null;
  if (km < 1) return t('distLessThan1');
  if (km < 3) return t('distAbout2');
  if (km < 7) return t('distAbout5');
  if (km < 15) return t('distAbout10');
  if (km < 35) return t('distAbout20');
  if (km < 75) return t('distAbout50');
  return t('distOver50');
}

// ------------------------------------------------------------------
// Rarity options
// ------------------------------------------------------------------
function useRarityOptions(t: (key: string) => string) {
  return [
    { value: '', label: t('rarityAll') },
    { value: 'common', label: t('rarityCommon') },
    { value: 'rare', label: t('rarityRare') },
    { value: 'epic', label: t('rarityEpic') },
    { value: 'legendary', label: t('rarityLegendary') },
  ];
}

const MIN_OVERLAP_OPTIONS = [1, 2, 3, 5, 10];

// ------------------------------------------------------------------
// Main content
// ------------------------------------------------------------------
function MatchFinderContent() {
  const t = useTranslations('trades.finder');
  const { user, loading: authLoading } = useUser();
  const { collections, loading: collectionsLoading } = useUserCollections();
  const { matches, loading, error, hasMore, totalCount, searchTrades, clearResults } = useFindTraders();
  const RARITY_OPTIONS = useRarityOptions(t);

  // ---- State ----
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('mixed');
  const [filters, setFilters] = useState({ rarity: '', team: '', query: '', minOverlap: 1 });
  const [localQuery, setLocalQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollDropdownOpen, setIsCollDropdownOpen] = useState(false);
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);

  // Geolocation
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  // Detail drawer
  const [selectedMatch, setSelectedMatch] = useState<TradeMatch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Offset for pagination
  const offsetRef = useRef(0);

  // ---- Auto-select collection ----
  useEffect(() => {
    if (collections.length > 0 && selectedCollectionId === null) {
      // Default to first active collection or first collection
      const active = collections.find(c => c.is_active);
      setSelectedCollectionId(active ? active.copy_id : collections[0].copy_id);
    }
  }, [collections, selectedCollectionId]);

  // ---- Restore geo from localStorage ----
  useEffect(() => {
    const stored = localStorage.getItem('matchfinder_geo');
    if (stored === 'granted') {
      navigator.geolocation?.getCurrentPosition(
        pos => setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => { /* silent fallback */ }
      );
    }
  }, []);

  // ---- Debounced query filter ----
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: localQuery }));
    }, 400);
    return () => clearTimeout(timeout);
  }, [localQuery]);

  // ---- Search trigger ----
  const doSearch = useCallback(
    (offset = 0) => {
      if (!user || !selectedCollectionId) return;
      offsetRef.current = offset;
      searchTrades({
        userId: user.id,
        collectionId: selectedCollectionId,
        filters,
        lat: geoCoords?.lat ?? null,
        lon: geoCoords?.lon ?? null,
        sort: sortMode === 'mixed' ? 'recent' : sortMode,
        limit: 20,
        offset,
      });
    },
    [user, selectedCollectionId, filters, geoCoords, sortMode, searchTrades]
  );

  // ---- Re-search on dependency change ----
  useEffect(() => {
    if (user && selectedCollectionId) {
      doSearch(0);
    }
  }, [user, selectedCollectionId, filters, sortMode, geoCoords, doSearch]);

  // ---- Geolocation opt-in ----
  const requestGeo = () => {
    setGeoRequested(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoDenied(false);
        localStorage.setItem('matchfinder_geo', 'granted');
      },
      () => {
        setGeoDenied(true);
        localStorage.removeItem('matchfinder_geo');
      }
    );
  };

  // ---- Load more ----
  const loadMore = () => {
    const nextOffset = offsetRef.current + 20;
    doSearch(nextOffset);
  };

  // ---- Filter helpers ----
  const handleFilterUpdate = (key: keyof typeof filters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ rarity: '', team: '', query: '', minOverlap: 1 });
    setLocalQuery('');
  };

  const hasActiveFilters = filters.rarity || filters.team || filters.query || filters.minOverlap > 1;

  // ---- Collection selector ----
  const selectedCollection = collections.find(c => c.copy_id === selectedCollectionId);
  const selectedRarity = RARITY_OPTIONS.find(r => r.value === filters.rarity);

  // ---- Loading state ----
  if (authLoading || collectionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  // ---- No collections ----
  if (collections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <EmptyState
            icon={ArrowRightLeft}
            title={t('noCollections')}
            description={t('noCollectionsDesc')}
            actionLabel={t('addCollectionCta')}
            actionHref="/marketplace"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ===== Page Header ===== */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('desc')}</p>
        </div>

        {/* ===== Filter Panel ===== */}
        <div className="mb-8 bg-white dark:bg-gray-800 border-2 border-black rounded-md p-4 shadow-xl space-y-4">
          {/* Collection Selector */}
          <div>
            <label className="block text-sm font-bold uppercase text-gray-900 dark:text-white mb-2">
              {t('collectionLabel')}
            </label>
            <div className="relative">
              <button
                onClick={() => setIsCollDropdownOpen(!isCollDropdownOpen)}
                className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-black rounded-md px-4 py-2 text-left flex items-center justify-between hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors text-gray-900 dark:text-white font-medium"
                aria-haspopup="listbox"
                aria-expanded={isCollDropdownOpen}
              >
                <span className="truncate">
                  {selectedCollection
                    ? selectedCollection.title
                    : t('collectionPlaceholder')}
                </span>
                <div className="flex items-center gap-2">
                  {selectedCollection?.is_active && (
                    <Badge
                      variant="secondary"
                      className="bg-gold text-gray-900 border border-black font-bold"
                    >
                      {t('activeBadge')}
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
              </button>

              {isCollDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsCollDropdownOpen(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-black rounded-md shadow-xl max-h-60 overflow-y-auto">
                    {collections.map(collection => (
                      <button
                        key={collection.copy_id}
                        onClick={() => {
                          setSelectedCollectionId(collection.copy_id);
                          setIsCollDropdownOpen(false);
                          clearResults();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-600 text-gray-900 dark:text-white font-medium transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <span className="truncate">{collection.title}</span>
                        {collection.is_active && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-gold text-gray-900 border border-black font-bold text-xs"
                          >
                            {t('activeBadge')}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-sm font-bold uppercase text-gray-900 dark:text-white mb-2">
              {t('searchPlaceholder')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={localQuery}
                onChange={e => setLocalQuery(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 border-2 border-black text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-gold focus:ring-gold rounded-md"
              />
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-gray-900 dark:text-white hover:text-white bg-gray-50 dark:bg-gray-700 hover:bg-gold border-2 border-black font-bold uppercase text-xs rounded-md"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('filterAdvanced')}
              <ChevronDown
                className={`w-4 h-4 ml-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </Button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-gray-900 dark:text-white hover:text-white bg-gray-50 dark:bg-gray-700 hover:bg-[#E84D4D] border-2 border-black font-bold uppercase text-xs rounded-md"
              >
                <X className="w-4 h-4 mr-1" />
                {t('filterClear')}
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              {/* Rarity Filter */}
              <div>
                <label className="block text-sm font-bold uppercase text-gray-900 dark:text-white mb-2">
                  {t('filterRarity')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsRarityDropdownOpen(!isRarityDropdownOpen)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-black rounded-md px-4 py-2 text-left flex items-center justify-between hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors text-gray-900 dark:text-white font-medium"
                    aria-haspopup="listbox"
                    aria-expanded={isRarityDropdownOpen}
                  >
                    <span>{selectedRarity?.label || t('rarityAll')}</span>
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>

                  {isRarityDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsRarityDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-gray-50 dark:bg-gray-700 border-2 border-black rounded-md shadow-xl">
                        {RARITY_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              handleFilterUpdate('rarity', option.value);
                              setIsRarityDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-600 text-gray-900 dark:text-white font-medium transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-sm font-bold uppercase text-gray-900 dark:text-white mb-2">
                  {t('filterTeam')}
                </label>
                <Input
                  type="text"
                  placeholder={t('filterTeam')}
                  value={filters.team}
                  onChange={e => handleFilterUpdate('team', e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border-2 border-black text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-gold focus:ring-gold rounded-md"
                />
              </div>

              {/* Min Overlap */}
              <div>
                <label className="block text-sm font-bold uppercase text-gray-900 dark:text-white mb-2">
                  {t('filterMinOverlap')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MIN_OVERLAP_OPTIONS.map(value => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={filters.minOverlap === value ? 'default' : 'outline'}
                      onClick={() => handleFilterUpdate('minOverlap', value)}
                      className={
                        filters.minOverlap === value
                          ? 'bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold rounded-md'
                          : 'text-gray-900 dark:text-white hover:text-white bg-gray-50 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 border-2 border-black font-bold rounded-md'
                      }
                    >
                      {value}+
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {t('filterMinOverlapDesc')}
                </p>
              </div>

              {/* Geolocation opt-in */}
              <div className="flex items-center gap-3 pt-2">
                {!geoCoords ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={requestGeo}
                    disabled={geoRequested && geoDenied}
                    className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold text-xs rounded-md hover:bg-gold hover:text-gray-900"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {geoDenied ? t('geoDenied') : t('geoOptIn')}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700 font-bold">
                    <MapPin className="w-3 h-3 mr-1" />
                    {t('geoOptIn')}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              {filters.rarity && (
                <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1">
                  {t('filterRarity')}: {RARITY_OPTIONS.find(r => r.value === filters.rarity)?.label}
                  <button
                    onClick={() => handleFilterUpdate('rarity', '')}
                    className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                    aria-label={t('filterClear')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.team && (
                <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1">
                  {t('filterTeam')}: {filters.team}
                  <button
                    onClick={() => handleFilterUpdate('team', '')}
                    className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                    aria-label={t('filterClear')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.query && (
                <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1">
                  {t('searchPlaceholder')}: {filters.query}
                  <button
                    onClick={() => { handleFilterUpdate('query', ''); setLocalQuery(''); }}
                    className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                    aria-label={t('filterClear')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.minOverlap > 1 && (
                <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1">
                  Min. {filters.minOverlap}
                  <button
                    onClick={() => handleFilterUpdate('minOverlap', 1)}
                    className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                    aria-label={t('filterClear')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ===== Sort Controls & Results Count ===== */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Results count */}
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {!loading && totalCount > 0 && (
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('resultsCount', { count: totalCount })}
              </span>
            )}
          </div>

          {/* Sort toggle */}
          <div className="max-w-xs w-full sm:w-auto">
            <SegmentedTabs
              tabs={[
                { value: 'mixed', label: t('sortMixed') },
                { value: 'overlap', label: t('sortOverlap') },
                { value: 'distance', label: t('sortDistance') },
              ]}
              value={sortMode}
              onValueChange={val => setSortMode(val as SortMode)}
              aria-label={t('sortLabel')}
            />
          </div>
        </div>

        {/* ===== Error State ===== */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-md flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* ===== Match Cards Grid ===== */}
        {loading && matches.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-gold" />
          </div>
        ) : matches.length === 0 && !loading ? (
          <EmptyState
            icon={ArrowRightLeft}
            title={t('noResults')}
            description={t('noResultsDesc')}
            actionLabel={t('addCollectionCta')}
            actionHref="/marketplace"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {matches.map((match, index) => {
                const isTopMatch = index === 0 && matches.length > 1;
                const isHighOverlap = match.total_mutual_overlap >= 10;

                return (
                  <div
                    key={match.match_user_id}
                    className={`
                      group relative transition-all duration-200 cursor-pointer
                      hover:-translate-y-1 hover:shadow-2xl
                      rounded-md
                      ${isTopMatch ? 'ring-2 ring-gold ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}
                      ${isHighOverlap && !isTopMatch ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}
                    `}
                    onClick={() => {
                      setSelectedMatch(match);
                      setDrawerOpen(true);
                    }}
                  >
                    {/* Top Match badge */}
                    {isTopMatch && (
                      <div className="absolute -top-3 left-4 z-10">
                        <Badge className="bg-gold text-gray-900 border-2 border-black font-black uppercase text-[10px] px-2 py-0.5 shadow-lg">
                          #1 Match
                        </Badge>
                      </div>
                    )}

                    {/* Distance badge */}
                    {match.distance_km != null && (
                      <div className="absolute -top-3 right-4 z-10">
                        <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-bold text-[10px] px-2 py-0.5 shadow">
                          <MapPin className="w-3 h-3 mr-1" />
                          {formatDistance(match.distance_km, t)}
                        </Badge>
                      </div>
                    )}

                    {/* We render the MatchCard but intercept clicks via the wrapper */}
                    <div className="pointer-events-none">
                      <MatchCard match={match} collectionId={selectedCollectionId!} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-black hover:bg-gold hover:text-gray-900 font-bold uppercase rounded-md px-8 py-3 shadow-lg transition-all duration-200 hover:shadow-xl"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('loadingMore')}
                    </>
                  ) : (
                    t('loadMore')
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* ===== Match Detail Drawer ===== */}
        <MatchDetailDrawer
          match={selectedMatch}
          collectionId={selectedCollectionId!}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <AuthGuard>
      <MatchFinderContent />
    </AuthGuard>
  );
}
