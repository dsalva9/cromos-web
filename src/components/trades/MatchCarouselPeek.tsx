'use client';

import type { TradeMatch } from '@/hooks/trades/useMatchSwiper';
import { User, MapPin } from 'lucide-react';

/**
 * MatchCarouselPeek — Desktop-only carousel that shows faded
 * previous / next cards alongside the active MatchSpotlight.
 *
 * Renders a peek card with avatar + nickname + basic stats,
 * scaled down and faded, positioned absolutely on either side.
 */

interface PeekCardProps {
  match: TradeMatch;
  side: 'left' | 'right';
}

function PeekCard({ match, side }: PeekCardProps) {
  const displayName = match.nickname || 'Usuario';

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2
        ${side === 'left' ? 'right-[calc(100%+16px)]' : 'left-[calc(100%+16px)]'}
        w-[260px] pointer-events-none select-none
        transition-all duration-300
      `}
      style={{
        opacity: 0.4,
        transform: `translateY(-50%) scale(0.85)`,
      }}
    >
      <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
        {/* Mini gold header */}
        <div className="bg-gradient-to-r from-gold/60 via-yellow-400/60 to-gold/60 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
          <p className="text-[10px] font-bold uppercase text-gray-900/50 text-center truncate">
            Match
          </p>
        </div>

        {/* User info */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {match.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-gold/60" />
              )}
            </div>

            {/* Name */}
            <p className="text-sm font-bold uppercase text-gray-600 dark:text-gray-400 truncate">
              {displayName}
            </p>
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
        <div className="border-t border-gray-200 dark:border-gray-700 py-2.5 px-3">
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

interface MatchCarouselPeekProps {
  matches: TradeMatch[];
  currentIndex: number;
  children: React.ReactNode;
}

export function MatchCarouselPeek({ matches, currentIndex, children }: MatchCarouselPeekProps) {
  const prevMatch = currentIndex > 0 ? matches[currentIndex - 1] : null;
  const nextMatch = currentIndex < matches.length - 1 ? matches[currentIndex + 1] : null;

  return (
    <div className="relative hidden md:block">
      {/* Peek cards — absolutely positioned, hidden on mobile */}
      {prevMatch && <PeekCard match={prevMatch} side="left" />}
      {nextMatch && <PeekCard match={nextMatch} side="right" />}

      {/* Active card (MatchSpotlight) */}
      {children}
    </div>
  );
}
