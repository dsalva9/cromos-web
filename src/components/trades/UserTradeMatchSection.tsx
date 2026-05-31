'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Zap, ArrowLeftRight } from 'lucide-react';
import { logger } from '@/lib/logger';
import { getOrCreateMatchConversation } from '@/lib/supabase/matches/chat';
import { ChatDrawer } from '@/components/chats/ChatDrawer';
import { toast } from '@/lib/toast';

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
  avatarUrl?: string | null;
}

/**
 * Displays a single grouped card on another user's profile showing
 * mutual sticker overlap across all collections, with a CTA to open a match chat.
 */
export function UserTradeMatchSection({ userId, nickname, avatarUrl }: UserTradeMatchSectionProps) {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const t = useTranslations('trades');

  const [overlaps, setOverlaps] = useState<CollectionOverlap[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState<{
    conversationId: number;
    collectionTitle: string;
    templateId: number;
    theyHaveCount: number;
    youHaveCount: number;
  } | null>(null);
  const [proposing, setProposing] = useState(false);

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

  const handlePropose = useCallback(async () => {
    if (proposing || overlaps.length === 0) return;
    setProposing(true);

    // Pick the collection with the highest total overlap
    const best = overlaps.reduce((a, b) => (b.totalOverlap > a.totalOverlap ? b : a), overlaps[0]);

    try {
      const { data, error } = await getOrCreateMatchConversation(
        supabase,
        userId,
        best.collectionId,
      );

      if (error || !data) {
        toast.error('Error al abrir chat');
        return;
      }

      setChatData({
        conversationId: data.id,
        collectionTitle: best.collectionName,
        templateId: best.collectionId,
        theyHaveCount: best.theyHaveForYou,
        youHaveCount: best.youHaveForThem,
      });
      setChatOpen(true);
    } catch {
      toast.error('Error al abrir chat');
    } finally {
      setProposing(false);
    }
  }, [supabase, userId, proposing, overlaps]);

  // Don't render anything if not logged in, viewing own profile, or no overlaps
  if (!user || user.id === userId || loading || overlaps.length === 0) {
    return null;
  }

  const displayNickname = nickname || t('matchSection.thisUser');

  return (
    <>
      <div className="mt-8">
        <div
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
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 dark:bg-gold/10">
              <Zap className="h-4 w-4 text-gold" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {t('matchSection.title', { nickname: displayNickname })}
            </h3>
          </div>

          {/* Collection rows */}
          <div className="space-y-3 mb-4">
            {overlaps.map((overlap) => (
              <div
                key={overlap.collectionId}
                className="rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 p-3"
              >
                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  {overlap.collectionName}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-xl font-black text-gold">{overlap.theyHaveForYou}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t('matchSection.theyHaveForYou')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-gold">{overlap.youHaveForThem}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t('matchSection.youHaveForThem')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Single CTA */}
          <button
            onClick={() => void handlePropose()}
            disabled={proposing}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl',
              'bg-gold hover:bg-gold-light text-black font-bold',
              'transition-all duration-200 hover:shadow-md hover:shadow-gold/20',
              'active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {proposing ? (
              <div className="animate-spin h-4 w-4 border-2 border-black border-r-transparent rounded-full" />
            ) : (
              <ArrowLeftRight className="h-4 w-4" />
            )}
            {t('matchSection.cta')}
          </button>
        </div>
      </div>

      {/* Match Chat Drawer */}
      {chatData && (
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          conversationId={chatData.conversationId}
          otherNickname={nickname || 'Usuario'}
          otherAvatarUrl={avatarUrl}
          collectionTitle={chatData.collectionTitle}
          templateId={chatData.templateId}
          otherUserId={userId}
          theyHaveCount={chatData.theyHaveCount}
          youHaveCount={chatData.youHaveCount}
        />
      )}
    </>
  );
}
