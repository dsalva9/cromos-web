'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useUsersWithDuplicateSlot, UserWithDuplicateSlot } from '@/hooks/templates/useUsersWithDuplicateSlot';
import { MatchDetailDrawer, TradeMatch } from '@/components/trades/MatchDetailDrawer';
import { SlotProgress } from '@/components/templates/SlotTile';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeftRight, MapPin, Loader2, Sparkles, Inbox } from 'lucide-react';

interface SlotTradeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotProgress | null;
  copyId: string;
  templateId?: number;
  collectionTitle?: string;
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

function formatDistanceShort(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return '< 1 km';
  if (km < 3) return '~2 km';
  if (km < 7) return '~5 km';
  if (km < 15) return '~10 km';
  if (km < 35) return '~20 km';
  if (km < 75) return '~50 km';
  if (km < 150) return '~100 km';
  if (km < 350) return '~200 km';
  if (km < 750) return '~500 km';
  return '> 500 km';
}

export function SlotTradeDrawer({
  open,
  onOpenChange,
  slot,
  copyId,
  templateId,
  collectionTitle,
}: SlotTradeDrawerProps) {
  const t = useTranslations('templates.slotTradeDrawer');
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<'matches' | 'distance'>('matches');

  const { users, loading, error } = useUsersWithDuplicateSlot(
    open && slot ? slot.slot_id : null,
    Number(copyId)
  );

  const hasAnyDistance = useMemo(
    () => users.some((u) => u.distance_km != null),
    [users]
  );

  const sortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    return [...users].sort((a, b) => {
      if (sortBy === 'distance') {
        const aDist = a.distance_km ?? Infinity;
        const bDist = b.distance_km ?? Infinity;
        if (aDist !== bDist) return aDist - bDist;
        return b.total_mutual_overlap - a.total_mutual_overlap;
      }
      // Default: sort by total matches
      if (b.total_mutual_overlap !== a.total_mutual_overlap) {
        return b.total_mutual_overlap - a.total_mutual_overlap;
      }
      return b.overlap_from_them_to_me - a.overlap_from_them_to_me;
    });
  }, [users, sortBy]);

  // Match detail drawer state for when user clicks "Ver intercambio"
  const [selectedMatch, setSelectedMatch] = useState<TradeMatch | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);

  const handleOpenMatchDetail = (u: UserWithDuplicateSlot) => {
    setSelectedMatch({
      match_user_id: u.match_user_id,
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      overlap_from_them_to_me: u.overlap_from_them_to_me,
      overlap_from_me_to_them: u.overlap_from_me_to_them,
      total_mutual_overlap: u.total_mutual_overlap,
      distance_km: u.distance_km,
      postcode: u.postcode,
      score: null,
    });
    setMatchDetailOpen(true);
  };

  const slotTitle = slot
    ? slot.label || `#${slot.slot_number}${slot.slot_variant || ''}`
    : '';

  const slotSubtitle = slot && slot.label && slot.slot_number
    ? `#${slot.slot_number}${slot.slot_variant || ''}`
    : undefined;

  const content = (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
              {t('title', { stickerName: slotTitle })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {slotSubtitle ? `${slotSubtitle} • ` : ''}{t('subtitle')}
            </p>
          </div>
        </div>

        {/* Sorting Toggle */}
        {users.length > 1 && (
          <div className="flex bg-gray-100 dark:bg-gray-800/80 rounded-lg p-0.5 mt-3 border border-gray-200/60 dark:border-gray-700/60">
            <button
              type="button"
              onClick={() => setSortBy('matches')}
              className={cn(
                "flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                sortBy === 'matches'
                  ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('sortByMatches')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (hasAnyDistance) setSortBy('distance');
              }}
              disabled={!hasAnyDistance}
              className={cn(
                "flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                sortBy === 'distance'
                  ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('sortByDistance')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Body / List */}
      <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <span className="text-sm font-medium">{t('loading')}</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-sm text-red-500">
            {error}
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('noUsers')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('noUsersDesc')}
            </p>
          </div>
        ) : (
          sortedUsers.map((u) => {
            const distance = formatDistanceShort(u.distance_km);
            return (
              <div
                key={u.match_user_id}
                className="p-3 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-gray-200 dark:border-gray-700 shrink-0">
                    <AvatarImage src={u.avatar_url || undefined} alt={u.nickname} />
                    <AvatarFallback className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {u.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {u.nickname}
                      </span>
                      {distance && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
                          <MapPin className="w-2.5 h-2.5" />
                          {distance}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
                        <Sparkles className="w-3 h-3" />
                        {t('matches', { count: u.total_mutual_overlap })}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {t('theyOfferCount', { count: u.overlap_from_them_to_me })} • {t('youOfferCount', { count: u.overlap_from_me_to_them })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenMatchDetail(u)}
                  className="bg-gold hover:bg-gold/90 text-black font-bold text-xs h-8 px-3 shrink-0 rounded-lg shadow-sm"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                  {t('viewTrade')}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-4 pt-2">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{t('title', { stickerName: slotTitle })}</DrawerTitle>
              <DrawerDescription>{t('subtitle')}</DrawerDescription>
            </DrawerHeader>
            {content}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md md:max-w-lg p-5">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('title', { stickerName: slotTitle })}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      )}

      {/* Match Detail Drawer for Trade Proposal */}
      {templateId && selectedMatch && (
        <MatchDetailDrawer
          match={selectedMatch}
          collectionId={templateId}
          collectionTitle={collectionTitle}
          open={matchDetailOpen}
          onOpenChange={setMatchDetailOpen}
        />
      )}
    </>
  );
}
