'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MatchDetailDrawer } from './MatchDetailDrawer';
import {
  User,
  MapPin,
  X,
  ArrowRightLeft,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TradeMatch } from '@/hooks/trades/useMatchSwiper';
import { logger } from '@/lib/logger';

// ------------------------------------------------------------------
// Sticker preview type
// ------------------------------------------------------------------
interface StickerPreview {
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  rarity: string;
}

function getRarityBadgeClass(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-600';
    case 'epic':
      return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white border-purple-600';
    case 'rare':
      return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-blue-600';
    default:
      return 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-400';
  }
}

// ------------------------------------------------------------------
// Distance bucket
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
// MatchSpotlight
// ------------------------------------------------------------------
interface MatchSpotlightProps {
  match: TradeMatch;
  collectionTitle: string;
  collectionId: number;
  currentIndex: number;
  totalMatches: number;
  radiusKm: number | null;
  onPass: () => void;
  onPropose: () => void;
}

export function MatchSpotlight({
  match,
  collectionTitle,
  collectionId,
  currentIndex,
  totalMatches,
  radiusKm,
  onPass,
  onPropose,
}: MatchSpotlightProps) {
  const t = useTranslations('trades.finder');
  const ts = useTranslations('trades.finder.swipe');
  const supabase = useSupabaseClient();
  const { user } = useUser();

  // ---- Sticker preview ----
  const [stickers, setStickers] = useState<StickerPreview[]>([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  // ---- Detail drawer ----
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ---- Swipe gesture state ----
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const displayName = match.nickname || 'Usuario';
  const distText = formatDistance(match.distance_km, t);

  // ---- Fetch sticker preview ----
  useEffect(() => {
    if (!user || !match) return;
    setStickers([]);
    setStickersLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('get_mutual_trade_detail', {
      p_user_id: user.id,
      p_other_user_id: match.match_user_id,
      p_collection_id: collectionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).then(({ data, error: err }: { data: any[] | null; error: unknown }) => {
      setStickersLoading(false);
      if (err) {
        logger.error('Sticker preview fetch error:', err);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (data || [])
        .filter((s: any) => s.direction === 'they_offer')
        .sort((a: any, b: any) => {
          const order: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
          return (order[a.rarity?.toLowerCase()] ?? 4) - (order[b.rarity?.toLowerCase()] ?? 4);
        })
        .slice(0, 5)
        .map((s: any) => ({
          sticker_id: s.slot_id ?? s.sticker_id,
          sticker_code: s.sticker_code,
          player_name: s.player_name,
          rarity: s.rarity,
        }));
      setStickers(items);
    });
  }, [match.match_user_id, collectionId, user, supabase]);

  // ---- Touch handlers ----
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
    setExitDirection(null);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Determine gesture direction on first significant movement
    if (isHorizontalRef.current === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontalRef.current) {
      e.preventDefault();
      setDragX(dx);
    }
  }, [isDragging]);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      const direction = dragX > 0 ? 'right' : 'left';
      setExitDirection(direction);
      setTimeout(() => {
        if (direction === 'left') {
          onPass();
        } else {
          onPropose();
        }
        setDragX(0);
        setExitDirection(null);
      }, 250);
    } else {
      setDragX(0);
    }
    isHorizontalRef.current = null;
  }, [dragX, onPass, onPropose]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (drawerOpen) return; // Don't handle when drawer is open
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setExitDirection('left');
        setTimeout(() => {
          onPass();
          setExitDirection(null);
        }, 250);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setExitDirection('right');
        setTimeout(() => {
          onPropose();
          setExitDirection(null);
        }, 250);
      } else if (e.key === ' ') {
        e.preventDefault();
        setDrawerOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPass, onPropose, drawerOpen]);

  // ---- Card transform ----
  const rotation = isDragging ? dragX * 0.05 : 0;
  const exitTransform = exitDirection === 'left'
    ? 'translateX(-120vw) rotate(-15deg)'
    : exitDirection === 'right'
      ? 'translateX(120vw) rotate(15deg)'
      : undefined;

  const cardStyle: React.CSSProperties = {
    transform: exitTransform || `translateX(${dragX}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
    touchAction: 'pan-y',
  };

  // ---- Drag indicator overlays ----
  const passOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));
  const proposeOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));

  return (
    <>
      <div className="relative w-full max-w-md mx-auto" style={{ minHeight: '480px' }}>
        {/* Counter + Radius */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-black font-bold text-xs">
            {ts('counter', { current: currentIndex + 1, total: totalMatches })}
          </Badge>
          {radiusKm != null ? (
            <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-bold text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {ts('radiusBadge', { km: radiusKm })}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-bold text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {ts('radiusUnlimited')}
            </Badge>
          )}
        </div>

        {/* Swipeable Card */}
        <div
          ref={cardRef}
          className="relative select-none"
          style={cardStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Pass overlay */}
          <div
            className="absolute inset-0 rounded-xl border-4 border-red-500 bg-red-500/10 z-10 pointer-events-none flex items-center justify-center"
            style={{ opacity: passOpacity, transition: isDragging ? 'none' : 'opacity 0.2s' }}
          >
            <span className="text-4xl font-black text-red-500 uppercase rotate-[-15deg] border-4 border-red-500 px-6 py-2 rounded-lg bg-white/80">
              {ts('pass')}
            </span>
          </div>

          {/* Propose overlay */}
          <div
            className="absolute inset-0 rounded-xl border-4 border-green-500 bg-green-500/10 z-10 pointer-events-none flex items-center justify-center"
            style={{ opacity: proposeOpacity, transition: isDragging ? 'none' : 'opacity 0.2s' }}
          >
            <span className="text-4xl font-black text-green-500 uppercase rotate-[15deg] border-4 border-green-500 px-6 py-2 rounded-lg bg-white/80">
              {ts('propose')}
            </span>
          </div>

          {/* Card body */}
          <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
            {/* Match header */}
            <div className="bg-gradient-to-r from-gold via-yellow-400 to-gold p-5 border-b-2 border-black">
              <div className="text-center">
                <p className="text-sm font-black uppercase text-gray-900/70 mb-1">
                  {ts('matchIn', { collection: collectionTitle })}
                </p>
              </div>
            </div>

            {/* User info */}
            <div className="p-6 pb-4">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gold border-2 border-black rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <User className="w-8 h-8 text-gray-900" />
                </div>
                <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white">
                  {displayName}
                </h2>
                {distText && (
                  <Badge variant="secondary" className="mt-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 font-bold">
                    <MapPin className="w-3 h-3 mr-1" />
                    {distText}
                  </Badge>
                )}
              </div>

              {/* Match stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border-2 border-black rounded-md">
                  <span className="text-sm font-bold uppercase text-green-700 dark:text-green-400">
                    🟢 {ts('theyHave', { count: match.overlap_from_them_to_me })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-black rounded-md">
                  <span className="text-sm font-bold uppercase text-blue-700 dark:text-blue-400">
                    🔵 {ts('youHave', { count: match.overlap_from_me_to_them })}
                  </span>
                </div>
              </div>

              {/* Sticker preview (expandable) */}
              <div className="mb-2">
                <button
                  onClick={() => setShowStickers(!showStickers)}
                  className="w-full flex items-center justify-between p-2 text-sm font-bold uppercase text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span>{ts('topStickers')}</span>
                  {showStickers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showStickers && (
                  <div className="mt-1 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    {stickersLoading ? (
                      <div className="flex justify-center py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-gold" />
                      </div>
                    ) : stickers.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        —
                      </p>
                    ) : (
                      stickers.map(s => (
                        <div
                          key={s.sticker_id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-700"
                        >
                          <span className="text-xs font-mono font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded border border-black">
                            #{s.sticker_code}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                            {s.player_name}
                          </span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getRarityBadgeClass(s.rarity)}`}>
                            {s.rarity}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* View detail link */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-full text-center text-sm font-bold text-gold hover:text-yellow-500 transition-colors py-2 flex items-center justify-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {ts('viewDetail')}
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-0 border-t-2 border-black">
              <Button
                onClick={() => {
                  setExitDirection('left');
                  setTimeout(() => {
                    onPass();
                    setExitDirection(null);
                  }, 250);
                }}
                className="rounded-none rounded-bl-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border-r-2 border-black font-black uppercase text-base py-6 transition-colors"
                variant="ghost"
                size="lg"
              >
                <X className="w-6 h-6 mr-2" />
                {ts('pass')}
              </Button>
              <Button
                onClick={() => {
                  setExitDirection('right');
                  setTimeout(() => {
                    onPropose();
                    setExitDirection(null);
                  }, 250);
                }}
                className="rounded-none rounded-br-xl bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase text-base py-6 transition-colors"
                variant="ghost"
                size="lg"
              >
                <ArrowRightLeft className="w-6 h-6 mr-2" />
                {ts('propose')}
              </Button>
            </div>
          </div>
        </div>

        {/* Swipe hint (mobile only) */}
        <div className="mt-4 text-center md:hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{ts('swipeHint')}</p>
        </div>

        {/* Keyboard hint (desktop only) */}
        <div className="mt-4 text-center hidden md:block">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{ts('keyboardHint')}</p>
        </div>
      </div>

      {/* Detail Drawer */}
      <MatchDetailDrawer
        match={match}
        collectionId={collectionId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
