'use client';

import { useTranslations } from 'next-intl';
import { ArrowRightLeft, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { MatchCard } from '@/components/trades/MatchCard';
import type { TradeMatch } from '@/hooks/trades/useMatchSwiper';
import Link from '@/components/ui/link';

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
  if (km < 150) return t('distAbout100');
  if (km < 350) return t('distAbout200');
  if (km < 750) return t('distAbout500');
  return t('distOver500');
}

// ------------------------------------------------------------------
// Grid View
// ------------------------------------------------------------------
interface MatchGridViewProps {
  matches: TradeMatch[];
  collectionId: number;
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
}

export function MatchGridView({
  matches,
  collectionId,
  loading,
  hasMore,
  totalCount,
  onLoadMore,
}: MatchGridViewProps) {
  const t = useTranslations('trades.finder');

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  if (matches.length === 0 && !loading) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title={t('noResults')}
        description={t('noResultsDesc')}
        actionLabel={t('addCollectionCta')}
        actionHref="/marketplace"
      />
    );
  }

  return (
    <>
      {/* Results count */}
      {totalCount > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('resultsCount', { count: totalCount })}
        </div>
      )}

      {/* Cards grid — 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
        {matches.map((match, index) => {
          const isTopMatch = index === 0 && matches.length > 1;
          const isHighOverlap = match.total_mutual_overlap >= 10;

          return (
            <Link
              key={match.match_user_id}
              href={`/users/${match.match_user_id}`}
              className={`
                group relative transition-all duration-200
                hover:-translate-y-1 hover:shadow-2xl
                rounded-md block
                ${isTopMatch ? 'ring-2 ring-gold ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}
                ${isHighOverlap && !isTopMatch ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}
              `}
            >
              {/* Top Match badge */}
              {isTopMatch && (
                <div className="absolute -top-3 left-4 z-10">
                  <Badge className="bg-gold text-gray-900 border-2 border-black font-black uppercase text-[10px] px-2 py-0.5 shadow-lg">
                    #1 Match
                  </Badge>
                </div>
              )}

              <div className="pointer-events-none">
                <MatchCard match={match} collectionId={collectionId} rank={index} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={onLoadMore}
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
  );
}
