'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { MatchDetail } from './MatchDetail';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TradeSticker {
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
}

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

interface MatchDetailDrawerProps {
  match: TradeMatch | null;
  collectionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export function MatchDetailDrawer({
  match,
  collectionId,
  open,
  onOpenChange,
}: MatchDetailDrawerProps) {
  const t = useTranslations('trades.finder');
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const isMobile = useIsMobile();

  const [theyOffer, setTheyOffer] = useState<TradeSticker[]>([]);
  const [iOffer, setIOffer] = useState<TradeSticker[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!match || !user) return;

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_mutual_trade_detail', {
        p_user_id: user.id,
        p_other_user_id: match.match_user_id,
        p_collection_id: collectionId,
      });

      if (error) {
        logger.error('get_mutual_trade_detail error:', error);
        return;
      }

      const results = data || [];
      setTheyOffer(
        results
          .filter((r: TradeSticker & { direction: string }) => r.direction === 'they_offer')
          .map((r: TradeSticker & { direction: string }) => ({
            sticker_id: r.sticker_id,
            sticker_code: r.sticker_code,
            player_name: r.player_name,
            team_name: r.team_name,
            rarity: r.rarity,
            count: r.count,
          }))
      );
      setIOffer(
        results
          .filter((r: TradeSticker & { direction: string }) => r.direction === 'i_offer')
          .map((r: TradeSticker & { direction: string }) => ({
            sticker_id: r.sticker_id,
            sticker_code: r.sticker_code,
            player_name: r.player_name,
            team_name: r.team_name,
            rarity: r.rarity,
            count: r.count,
          }))
      );
    } catch (err) {
      logger.error('fetchDetail error:', err);
    } finally {
      setLoading(false);
    }
  }, [match, user, supabase, collectionId]);

  useEffect(() => {
    if (open && match) {
      fetchDetail();
    } else {
      setTheyOffer([]);
      setIOffer([]);
    }
  }, [open, match, fetchDetail]);

  const displayName = match?.nickname || 'Usuario';
  const composeHref = match
    ? `/intercambios/componer?userId=${match.match_user_id}&collectionId=${collectionId}`
    : '#';

  const content = (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : (
        <>
          <MatchDetail
            theyOffer={theyOffer}
            iOffer={iOffer}
            targetUserNickname={displayName}
          />

          <div className="px-1 pb-2">
            <Link href={composeHref} className="block">
              <Button
                className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase text-sm py-3 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                size="lg"
              >
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                {t('proposeCta')}
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] bg-white dark:bg-gray-900 border-t-2 border-black">
          <DrawerHeader className="border-b-2 border-gray-200 dark:border-gray-700">
            <DrawerTitle className="font-black uppercase text-gray-900 dark:text-white">
              {displayName}
            </DrawerTitle>
            <DrawerDescription className="text-gray-600 dark:text-gray-400">
              {t('mutualTrades', { count: match?.total_mutual_overlap ?? 0 })}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto p-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 border-2 border-black">
        <DialogHeader>
          <DialogTitle className="font-black uppercase text-gray-900 dark:text-white">
            {displayName}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {t('mutualTrades', { count: match?.total_mutual_overlap ?? 0 })}
          </DialogDescription>
        </DialogHeader>
        <div className="p-2">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
