'use client';

import type { TradeMatch } from '@/hooks/trades/useMatchSwiper';
import { User, MapPin, X, Undo2 } from 'lucide-react';

/**
 * MatchCarouselPeek — Desktop-only carousel that shows:
 * - LEFT: the last passed card (red-tinted, clickable to undo)
 * - RIGHT: the next upcoming card (faded preview)
 */

interface PeekCardProps {
  match: TradeMatch;
  side: 'left' | 'right';
  variant: 'passed' | 'upcoming';
  onClick?: () => void;
}

function PeekCard({ match, side, variant, onClick }: PeekCardProps) {
  const displayName = match.nickname || 'Usuario';
  const isPassed = variant === 'passed';

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2
        ${side === 'left' ? 'right-[calc(100%+16px)]' : 'left-[calc(100%+16px)]'}
        w-[240px] select-none
        transition-all duration-500 ease-out
        ${onClick ? 'cursor-pointer pointer-events-auto hover:opacity-60' : 'pointer-events-none'}
      `}
      style={{
        opacity: isPassed ? 0.5 : 0.35,
        transform: `translateY(-50%) scale(0.82)`,
      }}
      onClick={onClick}
    >
      <div className={`
        bg-white dark:bg-gray-800 border-2 rounded-xl shadow-lg overflow-hidden relative
        ${isPassed ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'}
      `}>
        {/* Tinted overlay for passed cards */}
        {isPassed && (
          <div className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none" />
        )}

        {/* Mini header */}
        <div className={`
          px-3 py-2 border-b
          ${isPassed
            ? 'bg-gradient-to-r from-red-200/60 via-red-300/60 to-red-200/60 border-red-200 dark:border-red-800'
            : 'bg-gradient-to-r from-gold/60 via-yellow-400/60 to-gold/60 border-gray-300 dark:border-gray-600'
          }
        `}>
          <div className="flex items-center justify-center gap-1.5">
            {isPassed ? (
              <>
                <Undo2 className="w-3 h-3 text-red-500/70" />
                <p className="text-[10px] font-bold uppercase text-red-600/70 text-center truncate">
                  Pasado
                </p>
              </>
            ) : (
              <p className="text-[10px] font-bold uppercase text-gray-900/50 text-center truncate">
                Siguiente
              </p>
            )}
          </div>
        </div>

        {/* User info */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
              ${isPassed ? 'bg-red-100 border border-red-300/50' : 'bg-gold/20 border border-gold/50'}
            `}>
              {match.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className={`w-4 h-4 ${isPassed ? 'text-red-400/60' : 'text-gold/60'}`} />
              )}
            </div>

            <p className={`text-sm font-bold uppercase truncate ${isPassed ? 'text-red-500/60 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
              {displayName}
            </p>

            {isPassed && (
              <X className="w-4 h-4 text-red-400 flex-shrink-0 ml-auto" />
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>🟢 {match.overlap_from_them_to_me}</span>
            <span>·</span>
            <span>🔵 {match.overlap_from_me_to_them}</span>
            {match.distance_km != null && (
              <>
                <span>·</span>
                <MapPin className="w-3 h-3 inline" />
                <span>~{Math.round(match.distance_km)} km</span>
              </>
            )}
          </div>
        </div>

        {/* Faded action area */}
        <div className="border-t border-gray-200 dark:border-gray-700 py-2 px-3">
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

interface MatchCarouselPeekProps {
  /** Last card that was passed — shown on the left with red tint */
  passedMatch?: TradeMatch | null;
  /** Next upcoming card — shown on the right, faded */
  nextMatch?: TradeMatch | null;
  /** Callback when the passed (left) card is clicked to undo */
  onUndoPass?: () => void;
  children: React.ReactNode;
}

export function MatchCarouselPeek({ passedMatch, nextMatch, onUndoPass, children }: MatchCarouselPeekProps) {
  return (
    <div className="relative">
      {/* Peek cards — desktop only */}
      <div className="hidden md:block">
        {passedMatch && (
          <PeekCard
            match={passedMatch}
            side="left"
            variant="passed"
            onClick={onUndoPass}
          />
        )}
        {nextMatch && (
          <PeekCard
            match={nextMatch}
            side="right"
            variant="upcoming"
          />
        )}
      </div>

      {/* Active card (MatchSpotlight) — always visible */}
      {children}
    </div>
  );
}
