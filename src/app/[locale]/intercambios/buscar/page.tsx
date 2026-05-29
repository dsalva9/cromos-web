'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useIntlRouter } from '@/i18n/navigation';
import {
  MapPin,
  ArrowRightLeft,
  Loader2,
  Filter,
  ChevronDown,
  X,
  Layers,
  LayoutGrid,
  AlertCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/ui/empty-state';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { MatchSpotlight } from '@/components/trades/MatchSpotlight';
import { MatchGridView } from '@/components/trades/MatchGridView';
import {
  RadiusExpansionCard,
  ExhaustedCard,
} from '@/components/trades/RadiusExpansionCard';
import { useMatchSwiper } from '@/hooks/trades/useMatchSwiper';
import AuthGuard from '@/components/AuthGuard';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const RADIUS_TIERS = [10, 25, 50, null];
const MIN_OVERLAP_OPTIONS = [3, 5, 10, 20];

function useRarityOptions(t: (key: string) => string) {
  return [
    { value: '', label: t('rarityAll') },
    { value: 'common', label: t('rarityCommon') },
    { value: 'rare', label: t('rarityRare') },
    { value: 'epic', label: t('rarityEpic') },
    { value: 'legendary', label: t('rarityLegendary') },
  ];
}

// ------------------------------------------------------------------
// Geo Prompt Card
// ------------------------------------------------------------------
function GeoPromptCard({
  onEnable,
  onSkip,
}: {
  onEnable: () => void;
  onSkip: () => void;
}) {
  const ts = useTranslations('trades.finder.swipe');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 p-6 border-b-2 border-black">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-lg">
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl font-black uppercase text-white text-center">
            {ts('geoPrompt')}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <Button
            onClick={onEnable}
            className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase py-4 rounded-md shadow-lg"
            size="lg"
          >
            <MapPin className="w-5 h-5 mr-2" />
            📍 Activar ubicación
          </Button>
          <Button
            onClick={onSkip}
            variant="outline"
            className="w-full text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold uppercase py-3 rounded-md"
            size="lg"
          >
            Continuar sin ubicación
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main content
// ------------------------------------------------------------------
function MatchFinderContent() {
  const t = useTranslations('trades.finder');
  const ts = useTranslations('trades.finder.swipe');
  const router = useIntlRouter();
  const RARITY_OPTIONS = useRarityOptions(t);

  const swiper = useMatchSwiper();

  // ---- View mode ----
  const [viewMode, setViewMode] = useState<'spotlight' | 'grid'>('spotlight');

  // ---- Filter UI state ----
  const [showFilters, setShowFilters] = useState(false);
  const [isCollDropdownOpen, setIsCollDropdownOpen] = useState(false);
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);
  const [showCollSelector, setShowCollSelector] = useState(false);

  const hasActiveFilters =
    swiper.filters.rarity || swiper.filters.team || swiper.filters.query || swiper.filters.minOverlap > 5;

  const selectedCollection = swiper.collections.find(c => c.copy_id === swiper.selectedCollectionId);
  const selectedRarity = RARITY_OPTIONS.find(r => r.value === swiper.filters.rarity);

  // ---- Action handlers ----
  const handlePropose = useCallback(() => {
    const result = swiper.propose();
    if (result) {
      router.push(
        `/intercambios/componer?userId=${result.userId}&collectionId=${result.collectionId}`
      );
    }
  }, [swiper, router]);

  const handleCollectionChange = useCallback(() => {
    setShowCollSelector(true);
  }, []);

  // ---- Loading state ----
  if (swiper.phase === 'loading' && !swiper.error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Buscando matches...
          </p>
        </div>
      </div>
    );
  }

  // ---- No collections ----
  if (swiper.collections.length === 0 && !swiper.collectionsLoading) {
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ===== Header Bar ===== */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-gray-900 dark:text-white">
                {t('title')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('desc')}</p>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View toggle */}
              <SegmentedTabs
                tabs={[
                  { value: 'spotlight', label: ts('viewSpotlight') },
                  { value: 'grid', label: ts('viewGrid') },
                ]}
                value={viewMode}
                onValueChange={val => setViewMode(val as 'spotlight' | 'grid')}
                aria-label="View mode"
              />

              {/* Filter button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold uppercase text-xs rounded-md ${showFilters ? 'bg-gold text-gray-900' : 'hover:bg-gold hover:text-gray-900'}`}
              >
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block" />
                )}
              </Button>
            </div>
          </div>

          {/* Collection selector — always visible as a compact bar */}
          <div className="mt-4 relative">
            <button
              onClick={() => setIsCollDropdownOpen(!isCollDropdownOpen)}
              className="w-full sm:w-auto bg-white dark:bg-gray-800 border-2 border-black rounded-md px-4 py-2 text-left flex items-center justify-between gap-3 hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold transition-colors text-gray-900 dark:text-white font-bold text-sm"
            >
              <span className="truncate">
                📁 {selectedCollection?.title || t('collectionPlaceholder')}
              </span>
              <div className="flex items-center gap-2">
                {selectedCollection?.is_active && (
                  <Badge variant="secondary" className="bg-gold text-gray-900 border border-black font-bold text-[10px]">
                    {t('activeBadge')}
                  </Badge>
                )}
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </button>

            {isCollDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsCollDropdownOpen(false)} />
                <div className="absolute z-20 w-full sm:w-80 mt-1 bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl max-h-60 overflow-y-auto">
                  {swiper.collections.map(collection => (
                    <button
                      key={collection.copy_id}
                      onClick={() => {
                        swiper.setCollection(collection.copy_id);
                        setIsCollDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between focus:outline-none text-gray-900 dark:text-white font-medium transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${collection.copy_id === swiper.selectedCollectionId ? 'bg-gold/10' : ''}`}
                    >
                      <span className="truncate">{collection.title}</span>
                      {collection.is_active && (
                        <Badge variant="secondary" className="ml-2 bg-gold text-gray-900 border border-black font-bold text-xs">
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

        {/* ===== Filter Panel (collapsible) ===== */}
        {showFilters && (
          <div className="mb-6 bg-white dark:bg-gray-800 border-2 border-black rounded-md p-4 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase text-gray-900 dark:text-white text-sm">
                {t('filterAdvanced')}
              </h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => swiper.setFilters({ rarity: '', team: '', query: '', minOverlap: 5 })}
                    className="text-gray-900 dark:text-white hover:bg-[#E84D4D] hover:text-white border-2 border-black font-bold uppercase text-xs rounded-md"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {t('filterClear')}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-900 dark:text-white mb-1">
                {t('filterRarity')}
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsRarityDropdownOpen(!isRarityDropdownOpen)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-black rounded-md px-3 py-2 text-left flex items-center justify-between hover:border-gold focus:outline-none transition-colors text-gray-900 dark:text-white font-medium text-sm"
                >
                  <span>{selectedRarity?.label || t('rarityAll')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isRarityDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsRarityDropdownOpen(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl">
                      {RARITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            swiper.setFilters({ rarity: opt.value });
                            setIsRarityDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Team */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-900 dark:text-white mb-1">
                {t('filterTeam')}
              </label>
              <Input
                type="text"
                placeholder={t('filterTeam')}
                value={swiper.filters.team}
                onChange={e => swiper.setFilters({ team: e.target.value })}
                className="bg-gray-50 dark:bg-gray-700 border-2 border-black text-gray-900 dark:text-white text-sm rounded-md"
              />
            </div>

            {/* Min Overlap */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-900 dark:text-white mb-1">
                {t('filterMinOverlap')}
              </label>
              <div className="flex flex-wrap gap-2">
                {MIN_OVERLAP_OPTIONS.map(value => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={swiper.filters.minOverlap === value ? 'default' : 'outline'}
                    onClick={() => swiper.setFilters({ minOverlap: value })}
                    className={
                      swiper.filters.minOverlap === value
                        ? 'bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold rounded-md'
                        : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold rounded-md'
                    }
                  >
                    {value}+
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('filterMinOverlapDesc')}</p>
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                {swiper.filters.rarity && (
                  <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1 text-xs">
                    {selectedRarity?.label}
                    <button onClick={() => swiper.setFilters({ rarity: '' })} className="ml-1"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {swiper.filters.team && (
                  <Badge variant="secondary" className="bg-gold text-gray-900 border-2 border-black font-bold flex items-center gap-1 text-xs">
                    {swiper.filters.team}
                    <button onClick={() => swiper.setFilters({ team: '' })} className="ml-1"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== Contextual Tips ===== */}
        <ContextualTip
          tipId="tip-matchfinder-howto"
          icon={Sparkles}
          title={t('tipHowTo.title')}
          description={t('tipHowTo.description')}
          className="mb-4"
        />
        <ContextualTip
          tipId="tip-matchfinder-setup"
          icon={Lightbulb}
          title={t('tipSetup.title')}
          description={t('tipSetup.description')}
          className="mb-6"
        />

        {/* ===== Error State ===== */}
        {swiper.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-md flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{swiper.error}</p>
          </div>
        )}

        {/* ===== Main Content Area ===== */}
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {viewMode === 'spotlight' ? (
            // ---- SPOTLIGHT MODE ----
            <>
              {swiper.phase === 'geo_prompt' ? (
                <GeoPromptCard
                  onEnable={swiper.requestGeo}
                  onSkip={swiper.dismissGeoPrompt}
                />
              ) : swiper.phase === 'loading' ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-gold" />
                </div>
              ) : swiper.phase === 'expand' ? (
                <RadiusExpansionCard
                  currentRadiusKm={swiper.radiusKm}
                  nextRadiusKm={
                    swiper.radiusTierIndex < RADIUS_TIERS.length - 1
                      ? RADIUS_TIERS[swiper.radiusTierIndex + 1]
                      : null
                  }
                  onExpand={swiper.expandRadius}
                  onReset={swiper.resetSeen}
                />
              ) : swiper.phase === 'exhausted' ? (
                <ExhaustedCard
                  onReset={swiper.resetSeen}
                  onChangeCollection={handleCollectionChange}
                />
              ) : swiper.currentMatch && swiper.selectedCollectionId ? (
                <MatchSpotlight
                  match={swiper.currentMatch}
                  collectionTitle={swiper.selectedCollectionTitle || ''}
                  collectionId={swiper.selectedCollectionId}
                  currentIndex={swiper.currentIndex}
                  totalMatches={swiper.totalMatches}
                  radiusKm={swiper.radiusKm}
                  onPass={swiper.pass}
                  onPropose={handlePropose}
                />
              ) : (
                <EmptyState
                  icon={ArrowRightLeft}
                  title={t('noResults')}
                  description={t('noResultsDesc')}
                  actionLabel={t('addCollectionCta')}
                  actionHref="/marketplace"
                />
              )}
            </>
          ) : (
            // ---- GRID MODE ----
            <div className="w-full">
              <MatchGridView
                matches={swiper.allMatches}
                collectionId={swiper.selectedCollectionId!}
                loading={swiper.loading}
                hasMore={swiper.hasMore}
                totalCount={swiper.allMatches.length}
                onLoadMore={swiper.loadMore}
              />
            </div>
          )}
        </div>
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
