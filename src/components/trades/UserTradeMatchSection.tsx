'use client';

import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import Link from '@/components/ui/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Zap, ArrowLeftRight } from 'lucide-react';
import { logger } from '@/lib/logger';

interface CollectionOverlap {
  collectionId: number;
  collectionName: string;
  theyHaveForYou: number;
  youHaveForThem: number;
  totalOverlap: number;
}

interface UserTradeMatchSectionProps {
  userId: string;
  nickname?: string;
}

/**
 * Displays a glassmorphism highlight card on another user's profile
 * showing mutual sticker overlap and a CTA to start a trade.
 *
 * Uses the `get_user_trade_overlap` SECURITY DEFINER RPC to bypass RLS
 * and calculate overlap server-side.
 *
 * Renders nothing if:
 * - No overlap exists
 * - Not logged in
 * - Viewing own profile
 */
export function UserTradeMatchSection({ userId, nickname }: UserTradeMatchSectionProps) {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const t = useTranslations('trades');

  const [overlaps, setOverlaps] = useState<CollectionOverlap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.id === userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchOverlap() {
      try {
        const { data, error } = await supabase.rpc('get_user_trade_overlap', {
          p_my_user_id: user!.id,
          p_their_user_id: userId,
        });

        if (error) {
          logger.error('Error fetching trade overlap:', error);
          return;
        }

        if (!cancelled && data) {
          const results: CollectionOverlap[] = data.map(
            (row: {
              template_id: number;
              collection_name: string;
              they_have_for_you: number;
              you_have_for_them: number;
              total_overlap: number;
            }) => ({
              collectionId: row.template_id,
              collectionName: row.collection_name,
              theyHaveForYou: row.they_have_for_you,
              youHaveForThem: row.you_have_for_them,
              totalOverlap: row.total_overlap,
            })
          );
          setOverlaps(results);
        }
      } catch (err) {
        logger.error('Error in UserTradeMatchSection:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOverlap();

    return () => {
      cancelled = true;
    };
  }, [user, userId, supabase]);

  // Don't render anything if not logged in, viewing own profile, or no overlaps
  if (!user || user.id === userId || loading || overlaps.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      {overlaps.map((overlap) => (
        <div
          key={overlap.collectionId}
          className={cn(
            'relative overflow-hidden rounded-2xl border p-5',
            'border-gold/30 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40',
            'dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10',
            'dark:border-gold/20',
            'backdrop-blur-sm shadow-lg shadow-gold/5',
          )}
        >
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 dark:bg-gold/10">
              <Zap className="h-4 w-4 text-gold" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {t('matchSection.title', { nickname: nickname || t('matchSection.thisUser') })}
            </h3>
          </div>

          {/* Collection name */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {overlap.collectionName}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 p-3 text-center">
              <p className="text-2xl font-black text-gold">{overlap.theyHaveForYou}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('matchSection.theyHaveForYou')}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 p-3 text-center">
              <p className="text-2xl font-black text-gold">{overlap.youHaveForThem}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('matchSection.youHaveForThem')}
              </p>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/intercambios/componer?userId=${userId}&collectionId=${overlap.collectionId}`}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl',
              'bg-gold hover:bg-gold-light text-black font-bold',
              'transition-all duration-200 hover:shadow-md hover:shadow-gold/20',
              'active:scale-[0.98]',
            )}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('matchSection.cta')}
          </Link>
        </div>
      ))}
    </div>
  );
}
