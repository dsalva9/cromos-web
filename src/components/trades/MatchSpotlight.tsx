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
  const { user } = useUser();

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
    <div className="relative w-full max-w-md mx-auto">
      {/* Counter + Radius */}
      <div className="flex items-center justify-between mb-3 px-1">
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

        {/* Card body — COMPACT */}
        <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
          {/* Gold header — compact */}
          <div className="bg-gradient-to-r from-gold via-yellow-400 to-gold px-4 py-2.5 border-b-2 border-black">
            <p className="text-xs font-black uppercase text-gray-900/70 text-center">
              ⚡ {ts('matchIn', { collection: collectionTitle })}
            </p>
          </div>

          {/* User info — horizontal layout */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
                {match.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gold" />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white truncate leading-tight">
                  {displayName}
                </h2>
              </div>

              {/* Distance badge */}
              {distText && (
                <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 font-bold text-xs flex-shrink-0">
                  <MapPin className="w-3 h-3 mr-0.5" />
                  {distText}
                </Badge>
              )}
            </div>

            {/* Stats — single inline row */}
            <div className="flex items-center gap-2 text-sm font-bold mb-3">
              <span className="text-green-600 dark:text-green-400">
                🟢 {match.overlap_from_them_to_me} {t('theyOfferShort')}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-blue-600 dark:text-blue-400">
                🔵 {match.overlap_from_me_to_them} {t('youOfferShort')}
              </span>
            </div>

            {/* Quick action buttons — Favorite + View Profile */}
            <div className="flex gap-2">
              <button
                onClick={handleToggleFav}
                disabled={favLoading}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:border-gold hover:text-gold text-sm font-bold transition-all"
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
              className="rounded-none rounded-bl-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border-r-2 border-black font-black uppercase text-base py-5 transition-colors"
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
              className="rounded-none rounded-br-xl bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase text-base py-5 transition-colors"
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
    </div>
  );
}
