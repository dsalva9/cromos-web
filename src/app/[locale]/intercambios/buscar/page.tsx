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
import { ExhaustedCard } from '@/components/trades/RadiusExpansionCard';
import { useMatchSwiper, RADIUS_TIERS } from '@/hooks/trades/useMatchSwiper';
import AuthGuard from '@/components/AuthGuard';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const MIN_OVERLAP_OPTIONS = [3, 5, 10, 20];

// Radius slider labels
function getRadiusLabel(tierIndex: number, t: (key: string, values?: Record<string, string | number>) => string) {
  const value = RADIUS_TIERS[tierIndex];
  if (value === null || value === undefined) return t('filterRadiusAll');
  return t('filterRadiusKm', { km: value });
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

  const swiper = useMatchSwiper();

  // ---- View mode ----
  const [viewMode, setViewMode] = useState<'spotlight' | 'grid'>('spotlight');

  // ---- Radius slider: visual preview updates instantly, fetch only on release ----
  const [previewRadiusTier, setPreviewRadiusTier] = useState<number | null>(null);
  const displayRadiusTier = previewRadiusTier ?? swiper.radiusTierIndex;

  // ---- Filter UI state ----
  const [showFilters, setShowFilters] = useState(false);
  const [isCollDropdownOpen, setIsCollDropdownOpen] = useState(false);

  const hasActiveFilters =
    swiper.filters.team || swiper.filters.query || swiper.filters.minOverlap > 5;

  const selectedCollection = swiper.collections.find(c => c.copy_id === swiper.selectedCollectionId);

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
    setIsCollDropdownOpen(true);
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
          <div className="flex items-center justify-between gap-2">
            {/* Title — mobile: compact, desktop: full */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-gray-900 dark:text-white truncate">
                <span className="sm:hidden">{t('titleMobile')}</span>
                <span className="hidden sm:inline">{t('title')}</span>
              </h1>
              <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mt-1">{t('desc')}</p>
            </div>

            {/* Desktop: View toggle + filter button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View toggle — desktop only */}
              <div className="hidden sm:block">
                <SegmentedTabs
                  tabs={[
                    { value: 'spotlight', label: ts('viewSpotlight') },
                    { value: 'grid', label: ts('viewGrid') },
                  ]}
                  value={viewMode}
                  onValueChange={val => setViewMode(val as 'spotlight' | 'grid')}
                  aria-label="View mode"
                />
              </div>

              {/* Filter button — always visible */}
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
          <div className="mt-3 relative">
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
                    onClick={() => swiper.setFilters({ team: '', query: '', minOverlap: 5 })}
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

            {/* View mode toggle — mobile only (inside filters) */}
            <div className="sm:hidden">
              <label className="block text-xs font-bold uppercase text-gray-900 dark:text-white mb-1">
                {t('filterViewMode')}
              </label>
              <SegmentedTabs
                tabs={[
                  { value: 'spotlight', label: ts('viewSpotlight') },
                  { value: 'grid', label: ts('viewGrid') },
                ]}
                value={viewMode}
                onValueChange={val => setViewMode(val as 'spotlight' | 'grid')}
                aria-label="View mode"
              />
            </div>

            {/* Radius Slider */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-900 dark:text-white mb-2">
                {t('filterRadius')}
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={RADIUS_TIERS.length - 1}
                  step={1}
                  value={displayRadiusTier}
                  onChange={e => setPreviewRadiusTier(Number(e.target.value))}
                  onPointerUp={() => {
                    if (previewRadiusTier !== null) {
                      swiper.setRadiusTier(previewRadiusTier);
                      setPreviewRadiusTier(null);
                    }
                  }}
                  onTouchEnd={() => {
                    if (previewRadiusTier !== null) {
                      swiper.setRadiusTier(previewRadiusTier);
                      setPreviewRadiusTier(null);
                    }
                  }}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gold
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-gold [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono px-0.5">
                  {RADIUS_TIERS.map((v, i) => (
                    <span
                      key={i}
                      className={`${i === displayRadiusTier ? 'text-gold font-bold text-xs' : ''}`}
                    >
                      {v === null ? '∞' : v}
                    </span>
                  ))}
                </div>
                <div className="text-center">
                  <Badge
                    variant="secondary"
                    className="bg-gold/20 text-gray-900 dark:text-gold border border-gold/40 font-bold text-xs"
                  >
                    {getRadiusLabel(displayRadiusTier, t)}
                  </Badge>
                </div>
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
              ) : swiper.phase === 'exhausted' ? (
                <ExhaustedCard
                  onReset={swiper.resetSeen}
                  onChangeCollection={handleCollectionChange}
                />
              ) : swiper.currentMatch && swiper.selectedTemplateId ? (
                <MatchSpotlight
                  match={swiper.currentMatch}
                  collectionTitle={swiper.selectedCollectionTitle || ''}
                  collectionId={swiper.selectedTemplateId}
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
                collectionId={swiper.selectedTemplateId!}
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
