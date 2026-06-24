'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
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
import { TradeBuilder, TradeStickerExtended } from './TradeBuilder';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { getOrCreateMatchConversation } from '@/lib/supabase/matches/chat';
import { ChatDrawer } from '@/components/chats/ChatDrawer';
import { toast } from '@/lib/toast';

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
  collectionTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendTradeMessage?: (messages: string[]) => Promise<void>;
}

interface RawTradeDetail {
  slot_id: number;
  sticker_id?: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
  direction: 'they_offer' | 'i_offer';
  slot_number: number | null;
  global_number: number | null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );

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
  collectionTitle,
  open,
  onOpenChange,
  onSendTradeMessage,
}: MatchDetailDrawerProps) {
  const t = useTranslations('trades.finder');
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const isMobile = useIsMobile();

  const [theyOffer, setTheyOffer] = useState<TradeStickerExtended[]>([]);
  const [iOffer, setIOffer] = useState<TradeStickerExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingTrade, setSubmittingTrade] = useState(false);

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<number | null>(null);
  const [proposing, setProposing] = useState(false);

  const matchUserId = match?.match_user_id;

  const fetchDetail = useCallback(async () => {
    if (!matchUserId || !user) return;

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_mutual_trade_detail', {
        p_user_id: user.id,
        p_other_user_id: matchUserId,
        p_collection_id: collectionId,
      });

      if (error) {
        logger.error('get_mutual_trade_detail error:', error);
        return;
      }

      const results = (data || []) as RawTradeDetail[];
      setTheyOffer(
        results
          .filter((r) => r.direction === 'they_offer')
          .map((r) => ({
            sticker_id: r.slot_id ?? r.sticker_id ?? 0,
            sticker_code: r.sticker_code,
            player_name: r.player_name,
            team_name: r.team_name,
            rarity: r.rarity,
            count: r.count,
            slot_number: r.slot_number ?? null,
            global_number: r.global_number ?? null,
          }))
      );
      setIOffer(
        results
          .filter((r) => r.direction === 'i_offer')
          .map((r) => ({
            sticker_id: r.slot_id ?? r.sticker_id ?? 0,
            sticker_code: r.sticker_code,
            player_name: r.player_name,
            team_name: r.team_name,
            rarity: r.rarity,
            count: r.count,
            slot_number: r.slot_number ?? null,
            global_number: r.global_number ?? null,
          }))
      );
    } catch (err) {
      logger.error('fetchDetail error:', err);
    } finally {
      setLoading(false);
    }
  }, [matchUserId, user, supabase, collectionId]);

  useEffect(() => {
    if (open && matchUserId) {
      fetchDetail();
    } else if (!open) {
      setTheyOffer([]);
      setIOffer([]);
    }
  }, [open, matchUserId, fetchDetail]);

  const handleOpenChat = useCallback(async () => {
    if (proposing || !match) return;
    setProposing(true);
    try {
      const { data, error } = await getOrCreateMatchConversation(
        supabase,
        match.match_user_id,
        collectionId,
      );
      if (error || !data) {
        toast.error('Error al abrir chat');
        return;
      }
      setChatConversationId(data.id);
      onOpenChange(false); // close detail drawer
      setChatOpen(true);
    } catch {
      toast.error('Error al abrir chat');
    } finally {
      setProposing(false);
    }
  }, [supabase, match, collectionId, proposing, onOpenChange]);

  const handleSendTrade = async (messages: string[]) => {
    if (!onSendTradeMessage) return;
    setSubmittingTrade(true);
    try {
      await onSendTradeMessage(messages);
      onOpenChange(false);
    } catch (err) {
      logger.error('handleSendTrade error:', err);
      toast.error('Error al enviar la propuesta');
    } finally {
      setSubmittingTrade(false);
    }
  };

  const displayName = match?.nickname || 'Usuario';

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {loading && theyOffer.length === 0 && iOffer.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : onSendTradeMessage ? (
        <TradeBuilder
          theyOffer={theyOffer}
          iOffer={iOffer}
          targetUserNickname={displayName}
          onSubmit={handleSendTrade}
          submitting={submittingTrade}
        />
      ) : (
        <>
          <MatchDetail
            theyOffer={theyOffer}
            iOffer={iOffer}
            targetUserNickname={displayName}
          />

          <div className="px-1 pb-2">
            <Button
              onClick={() => void handleOpenChat()}
              disabled={proposing}
              className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase text-sm py-3 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              size="lg"
            >
              {proposing ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-5 h-5 mr-2" />
              )}
              {t('tradeCta')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const drawerUI = isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] bg-white dark:bg-gray-900 border-t-2 border-black !z-[130] flex flex-col overflow-hidden">
        <DrawerHeader className="border-b border-gray-200 dark:border-gray-700 py-3 flex-shrink-0">
          <DrawerTitle className="font-black uppercase text-gray-900 dark:text-white text-base">
            {displayName}
          </DrawerTitle>
          <DrawerDescription className="text-gray-600 dark:text-gray-400 text-sm">
            {t('mutualTrades', { count: match?.total_mutual_overlap ?? 0 })}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[env(safe-area-inset-bottom,16px)]">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[750px] flex flex-col bg-white dark:bg-gray-800 border-2 border-black !z-[130] [&+[data-slot=dialog-overlay]]:!z-[130] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="font-black uppercase text-gray-900 dark:text-white">
            {displayName}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {t('mutualTrades', { count: match?.total_mutual_overlap ?? 0 })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Force detail drawer above chat drawer (z-110) */}
      {open && (
        <style>{`
          [data-slot="dialog-overlay"],
          [data-slot="dialog-content"],
          [vaul-overlay],
          [vaul-drawer] { z-index: 130 !important; }
        `}</style>
      )}
      {drawerUI}

      {/* Chat drawer — opened from CTA */}
      {chatConversationId && match && (
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          conversationId={chatConversationId}
          otherNickname={displayName}
          collectionTitle={collectionTitle || null}
          templateId={collectionId}
          otherUserId={match.match_user_id}
          theyHaveCount={match.overlap_from_them_to_me}
          youHaveCount={match.overlap_from_me_to_them}
        />
      )}
    </>
  );
}
