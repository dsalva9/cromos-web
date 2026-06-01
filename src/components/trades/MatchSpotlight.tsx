'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  MapPin,
  X,
  ArrowRightLeft,
  Heart,
  ExternalLink,
} from 'lucide-react';
import type { TradeMatch } from '@/hooks/trades/useMatchSwiper';
import { useFavorites } from '@/hooks/social/useFavorites';
import Link from '@/components/ui/link';
import { MatchDetailDrawer } from '@/components/trades/MatchDetailDrawer';

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
  if (km < 150) return t('distAbout100');
  if (km < 350) return t('distAbout200');
  if (km < 750) return t('distAbout500');
  return t('distOver500');
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
  const { user } = useUser();

  // ---- Detail drawer state ----
  const [detailOpen, setDetailOpen] = useState(false);

  // ---- Favorite state ----
  const { checkFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (user && match.match_user_id) {
      checkFavorite(match.match_user_id).then(setIsFav);
    }
  }, [match.match_user_id, user, checkFavorite]);

  const handleToggleFav = async () => {
    if (favLoading) return;
    const result = await toggleFavorite(match.match_user_id);
    setIsFav(result);
  };

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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPass, onPropose]);

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
    <div className="relative w-full sm:max-w-lg mx-auto px-2 sm:px-0 overflow-hidden">
      {/* Counter + Radius */}
      <div className="flex items-center justify-between mb-3 px-1 gap-2">
        <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-black font-bold text-xs flex-shrink-0">
          {ts('counter', { current: currentIndex + 1, total: totalMatches })}
        </Badge>
        {radiusKm != null ? (
          <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-bold text-xs truncate min-w-0">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{ts('radiusBadge', { km: radiusKm })}</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-bold text-xs truncate min-w-0">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{ts('radiusUnlimited')}</span>
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

        {/* Card body — richer mobile layout */}
        <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
          {/* Gold header */}
          <div className="bg-gradient-to-r from-gold via-yellow-400 to-gold px-4 py-2.5 sm:py-3.5 border-b-2 border-black">
            <p className="text-xs sm:text-sm font-black uppercase text-gray-900/70 text-center">
              ⚡ {ts('matchIn', { collection: collectionTitle })}
            </p>
          </div>

          {/* User info */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5">
            {/* Avatar + Name row */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              {/* Avatar — larger on mobile now */}
              <div className="w-14 h-14 sm:w-14 sm:h-14 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
                {match.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-gold" />
                )}
              </div>

              {/* Name + location */}
              <div className="flex-1 min-w-0">
                <Link href={`/users/${match.match_user_id}`} className="block">
                  <h2 className="text-base sm:text-xl font-black uppercase text-gray-900 dark:text-white leading-tight hover:text-gold transition-colors line-clamp-2">
                    {displayName}
                  </h2>
                </Link>
                {/* Location info below name */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {distText && (
                    <span className="inline-flex items-center text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      <MapPin className="w-3 h-3 mr-0.5" />
                      {distText}
                    </span>
                  )}
                  {match.postcode && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      · {match.postcode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Match quality bar */}
            {match.score != null && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                    {t('matchQuality')}
                  </span>
                  <span className="text-[11px] font-black text-gold">
                    {Math.round(match.score * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold via-yellow-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${Math.round(match.score * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats — visual cards — clickable for detail */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center hover:border-green-400 hover:shadow-md transition-all cursor-pointer active:scale-[0.97]"
              >
                <p className="text-2xl sm:text-2xl font-black text-green-600 dark:text-green-400 leading-none">
                  {match.overlap_from_them_to_me}
                </p>
                <p className="text-[10px] sm:text-xs font-bold text-green-600/70 dark:text-green-400/70 mt-1 uppercase">
                  {t('theyOfferShort')}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center hover:border-blue-400 hover:shadow-md transition-all cursor-pointer active:scale-[0.97]"
              >
                <p className="text-2xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">
                  {match.overlap_from_me_to_them}
                </p>
                <p className="text-[10px] sm:text-xs font-bold text-blue-600/70 dark:text-blue-400/70 mt-1 uppercase">
                  {t('youOfferShort')}
                </p>
              </button>
            </div>

            {/* Quick action buttons — Favorite + View Profile */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleToggleFav}
                disabled={favLoading}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                  isFav
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                {t('addFavorite')}
              </button>
              <Link
                href={`/users/${match.match_user_id}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:border-gold hover:text-gold text-sm font-bold transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {t('viewProfile')}
              </Link>
            </div>
          </div>

          {/* Action buttons — Pass / ¡Cambiar! */}
          <div className="grid grid-cols-2 gap-0 border-t-2 border-black">
            <Button
              onClick={() => {
                setExitDirection('left');
                setTimeout(() => {
                  onPass();
                  setExitDirection(null);
                }, 250);
              }}
              className="rounded-none rounded-bl-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border-r-2 border-black font-black uppercase text-base sm:text-lg py-5 sm:py-6 transition-colors"
              variant="ghost"
              size="lg"
            >
              <X className="w-5 h-5 mr-1.5" />
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
              className="rounded-none rounded-br-xl bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase text-base sm:text-lg py-5 sm:py-6 transition-colors"
              variant="ghost"
              size="lg"
            >
              <ArrowRightLeft className="w-5 h-5 mr-1.5" />
              {ts('propose')}
            </Button>
          </div>
        </div>
      </div>

      {/* Swipe hint (mobile only) */}
      <div className="mt-3 text-center md:hidden">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{ts('swipeHint')}</p>
      </div>

      {/* Keyboard hint (desktop only) */}
      <div className="mt-3 text-center hidden md:block">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{ts('keyboardHint')}</p>
      </div>

      {/* Detail drawer — sticker-level overlap */}
      <MatchDetailDrawer
        match={{
          match_user_id: match.match_user_id,
          nickname: match.nickname,
          overlap_from_them_to_me: match.overlap_from_them_to_me,
          overlap_from_me_to_them: match.overlap_from_me_to_them,
          total_mutual_overlap: match.overlap_from_them_to_me + match.overlap_from_me_to_them,
          distance_km: match.distance_km,
          postcode: match.postcode,
          score: match.score,
        }}
        collectionId={collectionId}
        collectionTitle={collectionTitle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
